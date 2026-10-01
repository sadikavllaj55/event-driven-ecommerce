import type { ReactNode } from 'react';

export default function StaticPage({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-sm p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">{title}</h1>
      <div className="prose prose-sm text-gray-700 space-y-4 leading-relaxed">
        {children}
      </div>
    </div>
  );
}
