import { redirect } from 'next/navigation'
import { getDadosAdmin, isAdmin } from '@/lib/actions/admin'
import { AdminDashboard } from '@/components/admin/admin-dashboard'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Painel do Administrador — OrçaFacil-Frio',
}

export default async function AdminPage() {
  // Proteção: apenas o e-mail administrador acessa. Qualquer outro cai na home.
  if (!(await isAdmin())) {
    redirect('/')
  }

  const dados = await getDadosAdmin()
  return <AdminDashboard dados={dados} />
}
