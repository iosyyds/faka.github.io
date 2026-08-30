import { NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { verifyAdminToken } from '@/lib/security';

export async function POST(req) {
  try {
    // 验证管理员权限
    const auth = req.headers.get('authorization') || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token || !verifyAdminToken(token)) {
      return NextResponse.json({ success: false, error: '未授权' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file');

    if (!file) {
      return NextResponse.json({ success: false, error: '请选择文件' }, { status: 400 });
    }

    // 检查文件类型
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ success: false, error: '只支持图片格式（PNG/JPG/GIF/WEBP）' }, { status: 400 });
    }

    // 检查文件大小（最大2MB）
    const maxSize = 2 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json({ success: false, error: '图片大小不能超过2MB' }, { status: 400 });
    }

    // 转换为base64
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = buffer.toString('base64');
    const dataUrl = `data:${file.type};base64,${base64}`;

    return NextResponse.json({
      success: true,
      message: '图片上传成功',
      url: dataUrl
    });

  } catch (err) {
    console.error('上传图片失败:', err);
    return NextResponse.json({ success: false, error: err.message || '上传失败' }, { status: 500 });
  }
}
