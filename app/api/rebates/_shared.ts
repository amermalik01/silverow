import {NextResponse} from 'next/server';
import {getCompanyId} from '@/lib/auth/getCompanyId';
import {getServerSession} from 'next-auth';
import {authOptions} from '@/lib/auth';
import {RebateError} from '@/lib/services/rebates/rebate.service';
export async function actor(){const companyId=await getCompanyId();const session=await getServerSession(authOptions);if(!companyId||!session?.user?.id)throw new RebateError('Unauthorized',401);return {companyId,userId:session.user.id};}
export function apiError(e:unknown){if(e instanceof RebateError)return NextResponse.json({error:e.message},{status:e.status});console.error('Rebate API error',e);return NextResponse.json({error:'Internal server error'},{status:500});}
