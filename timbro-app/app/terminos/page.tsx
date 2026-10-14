import type { Metadata } from 'next';
import LegalPage from '@/components/LegalPage';
export const metadata: Metadata = { title: 'Términos y condiciones' };
export default function Page() { return <LegalPage doc="terminos" />; }
