import React from 'react';

export const renderInline = (text: string): React.ReactNode => {
  if (!text) return null;
  const codeParts = text.split(/(`[^`]+`)/g);
  return codeParts.map((part, i) => {
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
      return (
        <code key={i} className="bg-slate-100 dark:bg-slate-800 text-rose-500 dark:text-rose-400 px-1.5 py-0.5 rounded text-[0.85em] font-mono">
          {part.slice(1, -1)}
        </code>
      );
    }
    const segs = part.split(/(\*\*\*.*?\*\*\*|\*\*.*?\*\*|\*[^*]+?\*|_[^_]+?_)/g);
    return segs.map((seg, j) => {
      if (seg.startsWith('***') && seg.endsWith('***'))
        return <strong key={`${i}-${j}`} className="font-black italic text-slate-900 dark:text-white">{seg.slice(3, -3)}</strong>;
      if (seg.startsWith('**') && seg.endsWith('**'))
        return <strong key={`${i}-${j}`} className="font-black text-slate-900 dark:text-white">{seg.slice(2, -2)}</strong>;
      if ((seg.startsWith('*') && seg.endsWith('*')) || (seg.startsWith('_') && seg.endsWith('_')))
        return <em key={`${i}-${j}`} className="italic">{seg.slice(1, -1)}</em>;
      return seg;
    });
  });
};

export const renderMarkdown = (text: string): React.ReactNode => {
  if (!text || text.trim() === '') return null;
  const segments = text.split(/(```[\s\S]*?```)/g);
  return segments.map((segment, si) => {
    if (segment.startsWith('```')) {
      const inner = segment.replace(/^```[^\n]*\n?/, '').replace(/```$/, '');
      return (
        <pre key={si} className="bg-slate-900 dark:bg-black text-emerald-400 text-xs p-4 rounded-xl my-3 overflow-x-auto custom-scrollbar font-mono leading-relaxed">
          <code>{inner}</code>
        </pre>
      );
    }
    const lines = segment.split('\n');
    return (
      <React.Fragment key={si}>
        {lines.map((line, i) => {
          const t = line.trim();
          if (t.startsWith('# ') && !t.startsWith('## '))
            return <h1 key={i} className="text-2xl font-black text-slate-900 dark:text-white mt-5 mb-2 leading-tight">{renderInline(t.slice(2))}</h1>;
          if (t.startsWith('## ') && !t.startsWith('### '))
            return <h2 key={i} className="text-lg font-black text-slate-900 dark:text-white mt-4 mb-1.5 leading-tight">{renderInline(t.slice(3))}</h2>;
          if (t.startsWith('### '))
            return <h3 key={i} className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider mt-4 mb-1.5">{renderInline(t.slice(4))}</h3>;
          if (t.startsWith('> '))
            return (
              <blockquote key={i} className="border-l-4 border-primary pl-4 my-2 italic text-slate-500 dark:text-slate-400 text-sm">
                {renderInline(t.slice(2))}
              </blockquote>
            );
          if (t === '- [ ]' || t.startsWith('- [ ] '))
            return (
              <div key={i} className="flex items-start gap-3 my-1">
                <span className="material-symbols-outlined text-slate-300 dark:text-slate-600 text-[20px] mt-0.5">check_box_outline_blank</span>
                <span className="text-slate-700 dark:text-slate-300 text-sm">{renderInline(t.slice(6))}</span>
              </div>
            );
          if (t === '- [x]' || t.startsWith('- [x] '))
            return (
              <div key={i} className="flex items-start gap-3 my-1">
                <span className="material-symbols-outlined text-primary filled text-[20px] mt-0.5">check_box</span>
                <span className="text-slate-400 dark:text-slate-500 line-through text-sm">{renderInline(t.slice(6))}</span>
              </div>
            );
          if (t.startsWith('- '))
            return (
              <div key={i} className="flex items-start gap-3 my-1">
                <span className="size-1.5 rounded-full bg-primary mt-2 shrink-0"></span>
                <span className="text-slate-700 dark:text-slate-300 text-sm">{renderInline(t.slice(2))}</span>
              </div>
            );
          const numMatch = t.match(/^(\d+)\.\s(.*)/);
          if (numMatch)
            return (
              <div key={i} className="flex items-start gap-3 my-1">
                <span className="text-xs font-black text-primary shrink-0 mt-0.5 w-5 text-right">{numMatch[1]}.</span>
                <span className="text-slate-700 dark:text-slate-300 text-sm">{renderInline(numMatch[2])}</span>
              </div>
            );
          if (t === '') return <div key={i} className="h-2"></div>;
          return (
            <p key={i} className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed my-0.5">
              {renderInline(t)}
            </p>
          );
        })}
      </React.Fragment>
    );
  });
};
