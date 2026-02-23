const fs = require('fs');
const file = 'src/pages/inspections/InspectionsPage.tsx';
let txt = fs.readFileSync(file, 'utf8');

const desktopStart = txt.indexOf('{/* ===== DESKTOP MAIN ROW ===== */}');
const mobileStart = txt.indexOf('{/* ===== MOBILE MAIN ROW ===== */}');

const headerStart = txt.indexOf('{/* Table Header (Hidden on Mobile) */}');
const listStart = txt.indexOf('{/* List Items */}');

if (desktopStart !== -1 && mobileStart !== -1 && headerStart !== -1 && listStart !== -1) {
  const newRow = `{/* ===== DESKTOP MAIN ROW ===== */}
      <div 
        className="hidden md:grid grid-cols-12 gap-5 px-4 py-4 items-center cursor-pointer border-l-2 border-transparent hover:bg-gray-50/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {/* Date */}
        <div className="col-span-2 pl-2">
          <span className="text-[13px] font-bold text-gray-800">{record.date}</span>
        </div>

        {/* Report ID & State */}
        <div className="col-span-2 min-w-0 flex flex-col justify-center">
          <span className="text-[13px] font-bold text-blue-600 block truncate leading-tight">{record.id}</span>
          <span className="text-[10px] text-gray-500 font-medium uppercase mt-0.5 flex items-center gap-1">
            <MapPin size={10}/> {record.state}
          </span>
        </div>

        {/* Driver */}
        <div className="col-span-2 flex items-center gap-3 min-w-0">
          <div className="h-7 w-7 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 flex-shrink-0">
            <User size={14} fill="currentColor" />
          </div>
          <div className="min-w-0 flex flex-col justify-center">
            <span className="text-[13px] font-bold text-gray-800 truncate block leading-tight">{record.driver}</span>
            <span className="text-[10px] text-gray-400 font-medium truncate block mt-0.5">{record.driverId}</span>
          </div>
        </div>

        {/* Asset */}
        <div className="col-span-2 flex flex-col justify-center min-w-0">
          <span className="text-[13px] font-bold text-gray-800 truncate block leading-tight">
            {primaryUnit?.license || record.vehiclePlate}
          </span>
          <span className="text-[10px] text-gray-500 font-medium truncate block mt-0.5">
            {primaryUnit?.type || record.vehicleType} - Level {record.level?.split(' ')[1] || record.level?.replace('Level ', '') || '1'}
            {unitCount > 1 && <span className="font-bold text-blue-600 ml-1">(+{unitCount - 1})</span>}
          </span>
        </div>

        {/* Violations Count */}
        <div className="col-span-1 flex justify-center items-center">
          {record.isClean ? (
            <span className="text-[13px] font-bold text-emerald-600">
              Clean
            </span>
          ) : (
            <span className="text-[13px] font-bold text-orange-600">
              {record.violations.length}
            </span>
          )}
        </div>

        {/* Max Severity */}
        <div className="col-span-1 flex justify-center items-center">
             <span className={\`text-[13px] font-bold \${maxSeverity >= 7 ? 'text-red-600' : 'text-gray-500'}\`}>
               {record.isClean ? 0 : maxSeverity}
             </span>
        </div>

        {/* Points */}
        <div className="col-span-1 flex justify-center items-center text-[13px] font-bold text-gray-900">
          {totalPoints}
        </div>

        {/* OOS Status */}
        <div className="col-span-1 flex items-center justify-between pl-2 pr-4">
           <div className="min-w-[48px]">
             {record.hasOOS && (
               <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-red-50/80 rounded text-[10px] font-bold text-red-600 tracking-wide uppercase whitespace-nowrap">
                 <ShieldAlert size={10} className="text-red-500 flex-shrink-0" /> OOS
               </span>
             )}
           </div>
           
           <div className="text-gray-400">
             {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
           </div>
        </div>
      </div>

      `;

  const newHeader = `{/* Table Header (Hidden on Mobile) */}
            <div className="hidden md:grid grid-cols-12 gap-5 px-4 py-3 bg-white border-b border-gray-100 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              <div className="col-span-2 pl-2">Insp. Date</div>
              <div className="col-span-2">Report ID & State</div>
              <div className="col-span-2">Driver</div>
              <div className="col-span-2">Asset</div>
              <div className="col-span-1 text-center">Violations</div>
              <div className="col-span-1 text-center">Severity</div>
              <div className="col-span-1 text-center">Points</div>
              <div className="col-span-1 pl-2">Status</div>
            </div>

            `;

  txt = txt.substring(0, headerStart) + newHeader + txt.substring(listStart);
  
  // Need to re-calculate indices since length changed
  const dStart2 = txt.indexOf('{/* ===== DESKTOP MAIN ROW ===== */}');
  const mStart2 = txt.indexOf('{/* ===== MOBILE MAIN ROW ===== */}');
  
  txt = txt.substring(0, dStart2) + newRow + txt.substring(mStart2);
  
  fs.writeFileSync(file, txt, 'utf8');
  console.log('Replaced successfully');
} else {
  console.log('Could not find tags');
}
