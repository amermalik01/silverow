import {NextResponse} from 'next/server';
import {z} from 'zod';
import {pool} from '@/lib/db';
import {actor,apiError} from '@/app/api/rebates/_shared';
import {RebateError} from '@/lib/services/rebates/rebate.service';
import {findEligibleRebates} from '@/lib/services/rebates/rebate-eligibility.service';
import {calculateRebates} from '@/lib/services/rebates/rebate-calculation.service';
const schema=z.object({partyId:z.uuid(),rebateType:z.enum(['SALES','PURCHASE']),postingDate:z.iso.date(),itemId:z.uuid(),uomId:z.uuid().nullable(),categoryIds:z.array(z.uuid()),quantity:z.number().positive(),netUnitPrice:z.number().nonnegative(),standardUnitPrice:z.number().nonnegative(),currencyId:z.uuid()});
export async function POST(req:Request){try{const {companyId}=await actor();const result=schema.safeParse(await req.json());if(!result.success)throw new RebateError(result.error.message,422);const ctx={...result.data,companyId};const c=await pool.connect();try{const party=await c.query('SELECT id FROM parties WHERE id=$1 AND company_id=$2 AND '+(ctx.rebateType==='SALES'?'is_customer':'is_supplier')+'=true',[ctx.partyId,companyId]);if(!party.rowCount)throw new RebateError('Party not eligible',404);const item=await c.query('SELECT id FROM items WHERE id=$1 AND company_id=$2',[ctx.itemId,companyId]);if(!item.rowCount)throw new RebateError('Item not found',404);const rules=await findEligibleRebates(c,ctx);return NextResponse.json({data:calculateRebates(ctx,rules)});}finally{c.release();}}catch(e){return apiError(e);}}
