import type { Metadata } from 'next';
import LegalPage from '@/components/LegalPage';
export const metadata: Metadata = { title: 'Aviso de privacidad' };
export default function Page() { return <LegalPage doc="privacidad" />; }
