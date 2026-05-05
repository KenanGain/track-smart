import re

with open('src/pages/inspections/InspectionsPage.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Take out the invalid BcReportAccordionItem at top of file
bad_accordion = text[:text.find('import { useState')]
text = text[text.find('import { useState'):]

# 2. Put it somewhere safe and correct
correct_accordion = '''
function BcReportAccordionItem({ title, subtitle, badgeLabel, children, defaultOpen = false }: any) {
  const [isOpen, React_setIsOpen] = React.useState(defaultOpen);
  return (
    <div className="border border-slate-200 rounded-lg bg-white overflow-hidden">
      <button
        onClick={() => React_setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-slate-50 transition-colors text-left bg-white border-0 outline-none"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="min-w-0">
            <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wide">{title}</h4>
            {subtitle && (
              <p className="text-xs text-slate-500 mt-0.5 normal-case tracking-normal font-normal truncate">{subtitle}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2.5 flex-shrink-0 ml-4">
          {badgeLabel && (
            <span className="px-2 py-0.5 text-[10px] font-bold rounded uppercase tracking-wide bg-slate-100 text-slate-500">{badgeLabel}</span>
          )}
          <svg className={w-4 h-4 text-slate-400 transition-transform } viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
        </div>
      </button>
      {isOpen && (
        <div className="border-t border-slate-200/80 bg-white">
          {children}
        </div>
      )}
    </div>
  );
}
'''

# Put it after the imports
insert_pos = text.find('\n\n', text.find('import '))
text = text[:insert_pos] + '\n\n' + correct_accordion + text[insert_pos:]

# 3. Use regex to strip the "Section " and numbers off ALL BcReportAccordionItem title="" properties.
import re
text = re.sub(r'title="Section \d+ - ', r'title="', text)

with open('src/pages/inspections/InspectionsPage.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print("done regex replacement")
