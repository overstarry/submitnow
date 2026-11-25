import {
  handleMcpDelete,
  handleMcpGet,
  handleMcpOptions,
  handleMcpPost,
} from '@/lib/mcp-http';
import { checkActionRateLimit } from '@/lib/rateLimit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function OPTIONS() {
  return handleMcpOptions();
}

export function GET() {
  return handleMcpGet();
}

export function DELETE() {
  return handleMcpDelete();
}

export async function POST(request: Request) {
  return handleMcpPost(request, (scope) => checkActionRateLimit(scope));
}
