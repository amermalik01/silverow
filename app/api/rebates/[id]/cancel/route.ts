import {NextResponse} from 'next/server';
import {actor,apiError} from '@/app/api/rebates/_shared';
import {RebateService} from '@/lib/services/rebates/rebate.service';
type Context={params:Promise<{id:string}>};
export async function POST(_req:Request,{params}:Context){try{const {companyId,userId}=await actor();return NextResponse.json({data:await RebateService.transition(companyId,(await params).id,'CANCELLED',userId)});}catch(e){return apiError(e);}}
