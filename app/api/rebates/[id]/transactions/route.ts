import {NextResponse} from 'next/server';
import {actor,apiError} from '@/app/api/rebates/_shared';
import {RebateService} from '@/lib/services/rebates/rebate.service';
type Context={params:Promise<{id:string}>};
export async function GET(_req:Request,{params}:Context){try{const {companyId}=await actor();return NextResponse.json({transactions:await RebateService.transactions(companyId,(await params).id)});}catch(e){return apiError(e);}}
