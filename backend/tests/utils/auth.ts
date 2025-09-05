import { ensureRole, ensureTenant } from './db'

export interface TokenResult {
  token: string
  userId: number
  tenantId: number
}

export async function getToken(
  server: (req: Request) => Promise<Response>, 
  roleName: string = 'stock_manager', 
  tenantName: string = 't1',
  username?: string
): Promise<TokenResult> {
  const roleId = await ensureRole(roleName)
  const tenantId = await ensureTenant(tenantName)
  const uniqueUsername = username || `${roleName}_${tenantName}_${Date.now()}`
  
  const register = await server(new Request('http://localhost/api/v1/auth/register', {
    method: 'POST', 
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ 
      name: `${roleName} User`, 
      user_name: uniqueUsername, 
      password: 'p@ssw0rd', 
      email: `${uniqueUsername}@example.com`, 
      role_id: roleId, 
      tenant_id: tenantId 
    })
  }))
 

  
  const login = await server(new Request('http://localhost/api/v1/auth/login', { 
    method: 'POST', 
    headers: { 'content-type': 'application/json' }, 
    body: JSON.stringify({ identifier: uniqueUsername, password: 'p@ssw0rd' }) 
  }))
  
  const body = await login.json()

  return { 
    token: body.data.token as string, 
    userId: body.data.user.id as number,
    tenantId 
  }
}

export async function getAdminToken(server: (req: Request) => Promise<Response>): Promise<string> {
  const result = await getToken(server, 'super_admin', 't1', 'admin')
  return result.token
}
