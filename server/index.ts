import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import db from './db.ts';

const app = express();
app.use(cors()); app.use(express.json());
const secret = process.env.JWT_SECRET || 'development-only-change-this-secret';
type AuthRequest = Request & { user?: { id: number; role: string; name: string; email: string } };
function auth(req: AuthRequest, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ error: 'Sign in to continue.' });
  try { req.user = jwt.verify(token, secret) as AuthRequest['user']; next(); }
  catch { return res.status(401).json({ error: 'Your session has expired. Sign in again.' }); }
}
function admin(req: AuthRequest, res: Response, next: NextFunction) { if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Admin access required.' }); next(); }
const productSchema = z.object({ name: z.string().min(2), provider: z.string().min(2), category: z.string().min(2), description: z.string().default(''), monthlyFee: z.number().nonnegative(), transactionRate: z.number().nonnegative().default(0), quantity: z.number().int().nonnegative(), color: z.string().optional() });
const productSelect = 'SELECT id,name,provider,category,description,monthly_fee as monthlyFee,transaction_rate as transactionRate,quantity,color,created_at as createdAt FROM products';
app.get('/api/health', (_req,res) => res.json({ status: 'ok' }));
app.post('/api/auth/register', (req,res) => {
  const schema = z.object({ name:z.string().min(2),email:z.string().email(),password:z.string().min(8) });
  const parsed = schema.safeParse(req.body); if (!parsed.success) return res.status(400).json({error:parsed.error.issues[0].message});
  const {name,email,password}=parsed.data;
  try { const result=db.prepare('INSERT INTO users (name,email,password_hash) VALUES (?,?,?)').run(name,email.toLowerCase(),bcrypt.hashSync(password,10)); const user={id:Number(result.lastInsertRowid),name,email:email.toLowerCase(),role:'user'}; return res.status(201).json({token:jwt.sign(user,secret,{expiresIn:'7d'}),user}); }
  catch { return res.status(409).json({error:'An account with this email already exists.'}); }
});
app.post('/api/auth/login', (req,res) => {
  const parsed=z.object({email:z.string().email(),password:z.string().min(1)}).safeParse(req.body); if(!parsed.success)return res.status(400).json({error:'Enter a valid email and password.'});
  const row=db.prepare('SELECT id,name,email,password_hash as passwordHash,role FROM users WHERE email=?').get(parsed.data.email.toLowerCase()) as {id:number;name:string;email:string;passwordHash:string;role:string}|undefined;
  if(!row||!bcrypt.compareSync(parsed.data.password,row.passwordHash))return res.status(401).json({error:'Email or password is incorrect.'});
  const user={id:row.id,name:row.name,email:row.email,role:row.role}; return res.json({token:jwt.sign(user,secret,{expiresIn:'7d'}),user});
});
app.get('/api/auth/me',auth,(req:AuthRequest,res)=>res.json({user:req.user}));
app.get('/api/products',auth,(_req,res)=>res.json(db.prepare(`${productSelect} ORDER BY id DESC`).all()));
app.get('/api/products/search',auth,(req,res)=>{
  const q=String(req.query.q||'').trim(), category=String(req.query.category||'');
  const min=Number(req.query.minPrice||0), max=Number(req.query.maxPrice||Number.MAX_SAFE_INTEGER);
  res.json(db.prepare(`${productSelect} WHERE (name LIKE ? OR provider LIKE ? OR category LIKE ?) AND category LIKE ? AND monthly_fee BETWEEN ? AND ? ORDER BY id DESC`).all(`%${q}%`,`%${q}%`,`%${q}%`,category?category:'%',min,max));
});
app.get('/api/transactions',auth,(req:AuthRequest,res)=>{
  const rows=db.prepare('SELECT t.id,t.amount,t.status,t.created_at as createdAt,p.name as productName,p.provider FROM transactions t JOIN products p ON p.id=t.product_id WHERE t.user_id=? ORDER BY t.id DESC LIMIT 8').all(req.user!.id);
  res.json(rows);
});
app.post('/api/products',auth,admin,(req,res)=>{
  const parsed=productSchema.safeParse(req.body); if(!parsed.success)return res.status(400).json({error:parsed.error.issues[0].message});
  const p=parsed.data; const result=db.prepare('INSERT INTO products (name,provider,category,description,monthly_fee,transaction_rate,quantity,color) VALUES (?,?,?,?,?,?,?,?)').run(p.name,p.provider,p.category,p.description,p.monthlyFee,p.transactionRate,p.quantity,p.color||'#d9f36a');
  res.status(201).json(db.prepare(`${productSelect} WHERE id=?`).get(result.lastInsertRowid));
});
app.put('/api/products/:id',auth,admin,(req,res)=>{
  const parsed=productSchema.safeParse(req.body); if(!parsed.success)return res.status(400).json({error:parsed.error.issues[0].message});
  const id=String(req.params.id); const p=parsed.data; const out=db.prepare('UPDATE products SET name=?,provider=?,category=?,description=?,monthly_fee=?,transaction_rate=?,quantity=?,color=? WHERE id=?').run(p.name,p.provider,p.category,p.description,p.monthlyFee,p.transactionRate,p.quantity,p.color||'#d9f36a',id);
  if(!out.changes)return res.status(404).json({error:'Product not found.'}); res.json(db.prepare(`${productSelect} WHERE id=?`).get(id));
});
app.delete('/api/products/:id',auth,admin,(req,res)=>{const out=db.prepare('DELETE FROM products WHERE id=?').run(String(req.params.id)); if(!out.changes)return res.status(404).json({error:'Product not found.'}); res.status(204).end();});
app.post('/api/products/:id/checkout',auth,(req:AuthRequest,res)=>{
  try {
    db.exec('BEGIN IMMEDIATE');
    const product=db.prepare('SELECT id,quantity,monthly_fee as monthlyFee FROM products WHERE id=?').get(String(req.params.id)) as {id:number;quantity:number;monthlyFee:number}|undefined;
    if(!product)throw new Error('Product not found.'); if(product.quantity<1)throw new Error('This offer is currently unavailable.');
    db.prepare('UPDATE products SET quantity=quantity-1 WHERE id=?').run(product.id);
    const tx=db.prepare('INSERT INTO transactions (user_id,product_id,amount) VALUES (?,?,?)').run(req.user!.id,product.id,product.monthlyFee);
    db.exec('COMMIT');
    return res.status(201).json({transactionId:Number(tx.lastInsertRowid),remaining:product.quantity-1});
  }catch(e){db.exec('ROLLBACK'); return res.status(409).json({error:e instanceof Error?e.message:'Checkout failed.'});}
});
app.post('/api/products/:id/restock',auth,admin,(req,res)=>{
  const quantity=Number(req.body.quantity); if(!Number.isInteger(quantity)||quantity<1)return res.status(400).json({error:'Enter a restock quantity greater than zero.'});
  const id=String(req.params.id); const out=db.prepare('UPDATE products SET quantity=quantity+? WHERE id=?').run(quantity,id); if(!out.changes)return res.status(404).json({error:'Product not found.'}); res.json(db.prepare(`${productSelect} WHERE id=?`).get(id));
});
const clientDist=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../dist');
app.use(express.static(clientDist));
app.get('*',(req,res,next)=>{if(req.path.startsWith('/api/'))return next();res.sendFile(path.join(clientDist,'index.html'));});
app.use((err:unknown,_req:Request,res:Response,_next:NextFunction)=>{console.error(err);res.status(500).json({error:'Something went wrong.'});});
const port=Number(process.env.PORT||4000); app.listen(port,()=>console.log(`Northstar API listening on ${port}`));
