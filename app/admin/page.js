'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminIndex() {
  const router = useRouter();
  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (!token) { router.replace('/admin/login'); return; }
    router.replace('/admin/dashboard');
  }, [router]);
  return <div style={{padding: '60px', textAlign: 'center', color: '#64748b'}}>跳转中...</div>;
}
