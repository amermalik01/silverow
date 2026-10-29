import {NextResponse} from 'next/server';
import {actor,apiError} from '@/app/api/rebates/_shared';
import {RebateService} from '@/lib/services/rebates/rebate.service';
type Context={params:Promise<{id:string}>};
export async function GET(_req:Request,{params}:Context){try{const {companyId}=await actor();return NextResponse.json({data:await RebateService.get(companyId,(await params).id)});}catch(e){return apiError(e);}}
export async function PUT(req:Request,{params}:Context){try{const {companyId,userId}=await actor();return NextResponse.json({data:await RebateService.update(companyId,(await params).id,await req.json(),userId)});}catch(e){return apiError(e);}}
