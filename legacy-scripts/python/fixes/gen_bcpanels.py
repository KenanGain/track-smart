import os

content = '''import React, { useState, Fragment } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { 
  cvsaSummaryData, 
  cvsaDetailsData, 
  collisionSummaryData, 
  collisionData,
  type CvsaDefectRow,
  type CvsaRow
} from './NscAnalysis';

export function BcCvsaPanel() {
  const [expandedInspections, setExpandedInspections] = useState<Record<number, boolean>>({});
  
  const toggleInspection = (id: number) => setExpandedInspections(prev => ({ ...prev, [id]: !prev[id] }));
  
  const totalCvsaOosDefects = cvsaSummaryData.reduce((acc, r) => acc + (r.oos || 0), 0);
  const totalCvsaRequiresAttentionDefects = cvsaSummaryData.reduce((acc, r) => acc + (r.req || 0), 0);
  const totalCvsaDefects = cvsaSummaryData.reduce((acc, r) => acc + (r.total || 0), 0);

  return (
    <div className="p-4 border-t border-slate-100 bg-slate-50/50 space-y-6">
      <div>
        <h5 className="text-xs font-bold text-slate-700 uppercase mb-3 tracking-wide">Inspection Defect Summary</h5>
        <div className="bg-white rounded-lg border border-slate-200 overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 text-[10px] uppercase tracking-wider bg-slate-50">
                <th className="px-4 py-3 font-medium text-center">Out of Service</th>
                <th className="px-4 py-3 font-medium text-center">Requires Attention</th>
                <th className="px-4 py-3 font-medium text-center">Total Defects</th>
                <th className="px-4 py-3 font-medium text-right">Percent of Total</th>
                <th className="px-4 py-3 font-medium text-left">Defect Category</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {cvsaSummaryData.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-50 transition-colors">
                  <td className={px-4 py-2 text-center \}>{row.oos ?? '-'}</td>
                  <td className={px-4 py-2 text-center \}>{row.req ?? '-'}</td>
                  <td className={px-4 py-2 text-center \}>{row.total ?? '-'}</td>
                  <td className={px-4 py-2 text-right \}>{row.percent ?? '-'}</td>
                  <td className={px-4 py-2 text-left \}>{row.desc}</td>
                </tr>
              ))}
              <tr className="bg-slate-50 font-bold text-slate-900 border-t border-slate-200 text-xs">
                <td className="px-4 py-3 text-center text-red-700">{totalCvsaOosDefects}</td>
                <td className="px-4 py-3 text-center text-amber-700">{totalCvsaRequiresAttentionDefects}</td>
                <td className="px-4 py-3 text-center">{totalCvsaDefects}</td>
                <td className="px-4 py-3 text-right">100%</td>
                <td className="px-4 py-3 text-left uppercase">Grand Total Defects</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h5 className="text-xs font-bold text-slate-700 uppercase mb-3 tracking-wide">Inspection List</h5>
        <div className="bg-white rounded-lg border border-slate-200 overflow-x-auto">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 text-[10px] uppercase tracking-wider bg-slate-50">
                <th className="px-4 py-3 font-medium text-center">Inspection</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">CVSA Document</th>
                <th className="px-4 py-3 font-medium text-center">Jur</th>
                <th className="px-4 py-3 font-medium">Agency</th>
                <th className="px-4 py-3 font-medium">Plate</th>
                <th className="px-4 py-3 font-medium text-center">Level</th>
                <th className="px-4 py-3 font-medium text-right">Result</th>
                <th className="px-4 py-3 font-medium text-center w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {cvsaDetailsData.map((item) => {
                let badgeClass = 'bg-slate-100 text-slate-700 border-slate-200';
                if (item.result === 'Passed') badgeClass = 'bg-green-50 text-green-700 border-green-200';
                if (item.result === 'Requires Attention') badgeClass = 'bg-orange-50 text-orange-700 border-orange-200';
                if (item.result === 'Out Of Service') badgeClass = 'bg-red-50 text-red-700 border-red-200';
                const rowOpen = expandedInspections[item.id];
                
                return (
                  <Fragment key={item.id}>
                    <tr
                      className={hover:bg-slate-50 transition-colors \ \}
                      onClick={() => item.details && toggleInspection(item.id)}
                    >
                      <td className="px-4 py-3 text-center font-bold text-slate-500">{item.id}</td>
                      <td className="px-4 py-3 text-slate-900 font-medium">{item.date}</td>
                      <td className="px-4 py-3 text-slate-700 font-medium">OPI {item.doc}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium">{item.jur}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-500">{item.details?.agency ?? '-'}</td>
                      <td className="px-4 py-3 text-slate-800 font-medium">{item.plate}</td>
                      <td className="px-4 py-3 text-center font-bold text-slate-600">{item.level}</td>
                      <td className="px-4 py-3 text-right">
                        <span className={order text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wide \}>{item.result}</span>
                      </td>
                      <td className="px-4 py-3 text-center w-10 text-slate-400">
                        {item.details && (rowOpen ? <ChevronUp className="w-4 h-4 mx-auto" /> : <ChevronDown className="w-4 h-4 mx-auto" />)}
                      </td>
                    </tr>
                    {rowOpen && item.details && (
                      <tr>
                        <td colSpan={9} className="p-0 border-b border-slate-200 bg-slate-100/40">
                          <div className="p-4 shadow-inner space-y-4">
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-6">
                              <div>
                                <div className="text-[10px] uppercase text-slate-500 font-bold mb-1">Inspection Date</div>
                                <div className="text-sm font-medium text-slate-800">{item.date}</div>
                              </div>
                              <div>
                                <div className="text-[10px] uppercase text-slate-500 font-bold mb-1">Time</div>
                                <div className="text-sm font-medium text-slate-800">{item.details.time}</div>
                              </div>
                              <div>
                                <div className="text-[10px] uppercase text-slate-500 font-bold mb-1">Document / Jur</div>
                                <div className="text-sm font-medium text-slate-800">OPI {item.doc}</div>
                                <div className="text-xs text-slate-500">{item.jur}</div>
                              </div>
                              <div>
                                <div className="text-[10px] uppercase text-slate-500 font-bold mb-1">Level / Result</div>
                                <div className="text-sm font-medium text-slate-800">Level {item.level}</div>
                                <div className="text-xs text-slate-500">{item.result}</div>
                              </div>
                              <div>
                                <div className="text-[10px] uppercase text-slate-500 font-bold mb-1">Date Entered</div>
                                <div className="text-sm font-medium text-slate-800">{item.details.dateEntered}</div>
                              </div>
                              <div>
                                <div className="text-[10px] uppercase text-slate-500 font-bold mb-1">Agency</div>
                                <div className="text-sm font-medium text-slate-800">{item.details.agency}</div>
                              </div>
                            </div>
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                              <div>
                                <div className="text-[10px] uppercase text-slate-500 font-bold mb-1">Location</div>
                                <div className="text-sm font-medium text-slate-800">{item.details.location}</div>
                              </div>
                              <div>
                                <div className="text-[10px] uppercase text-slate-500 font-bold mb-1">Driver</div>
                                <div className="text-sm font-medium text-slate-800">{item.details.driver}</div>
                              </div>
                            </div>
                            {item.details.vehicles.length > 0 && (
                              <div>
                                <div className="text-[10px] uppercase text-slate-500 font-bold mb-2">Vehicles</div>
                                <div className="overflow-x-auto rounded-lg border border-slate-200">
                                  <table className="w-full text-xs">
                                    <thead className="bg-slate-50 border-b border-slate-100">
                                      <tr>
                                        <th className="px-3 py-2 text-left font-bold text-slate-400 uppercase tracking-wider">Type</th>
                                        <th className="px-3 py-2 text-left font-bold text-slate-400 uppercase tracking-wider">Plate</th>
                                        <th className="px-3 py-2 text-left font-bold text-slate-400 uppercase tracking-wider">Jur</th>
                                        <th className="px-3 py-2 text-left font-bold text-slate-400 uppercase tracking-wider">VIN</th>
                                        <th className="px-3 py-2 text-left font-bold text-slate-400 uppercase tracking-wider">Year</th>
                                        <th className="px-3 py-2 text-left font-bold text-slate-400 uppercase tracking-wider">Make</th>
                                        <th className="px-3 py-2 text-left font-bold text-slate-400 uppercase tracking-wider">CVSA Decal #</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                      {item.details.vehicles.map((vehicle, vehicleIndex) => (
                                        <tr key={vehicleIndex} className="hover:bg-slate-50 bg-white">
                                          <td className="px-3 py-2 font-bold text-slate-600">{vehicle.type}</td>
                                          <td className="px-3 py-2 font-mono text-slate-800">{vehicle.plate}</td>
                                          <td className="px-3 py-2 text-slate-700">{vehicle.jur ?? '-'}</td>
                                          <td className="px-3 py-2 font-mono text-slate-500">{vehicle.vin ?? '-'}</td>
                                          <td className="px-3 py-2 text-slate-700">{vehicle.year ?? '-'}</td>
                                          <td className="px-3 py-2 text-slate-700">{vehicle.make}</td>
                                          <td className="px-3 py-2 text-slate-700">{vehicle.decal ?? '-'}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export function BcAccidentPanel() {
  return (
    <div className="p-4 border-t border-slate-100 bg-slate-50/50 space-y-6">
      <div>
        <h5 className="text-xs font-bold text-slate-700 uppercase mb-3 tracking-wide">Collision Summary</h5>
        <div className="bg-white rounded-lg border border-slate-200 overflow-x-auto">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 text-[10px] uppercase tracking-wider bg-slate-50">
                <th className="px-4 py-3 font-medium text-left">Severity</th>
                <th className="px-4 py-3 font-medium text-center">Supported</th>
                <th className="px-4 py-3 font-medium text-center">Not Supported / Not Reviewed</th>
                <th className="px-4 py-3 font-medium text-center">Total</th>
                <th className="px-4 py-3 font-medium text-right">Active Points</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {collisionSummaryData.map((row) => (
                <tr key={row.severity} className="hover:bg-slate-50 transition-colors">
                  <td className={px-4 py-3 \}>{row.severity}</td>
                  <td className={px-4 py-3 text-center \}>{row.supported || '-'}</td>
                  <td className={px-4 py-3 text-center \}>{row.notSupported || '-'}</td>
                  <td className={px-4 py-3 text-center \}>{row.total || '-'}</td>
                  <td className={px-4 py-3 text-right \}>{row.points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h5 className="text-xs font-bold text-slate-700 uppercase mb-3 tracking-wide">Collision Events</h5>
        <div className="bg-white rounded-lg border border-slate-200 overflow-x-auto">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 text-[10px] uppercase tracking-wider bg-slate-50">
                <th className="px-4 py-3 font-medium text-center">Collision</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Document</th>
                <th className="px-4 py-3 font-medium text-center">Jur</th>
                <th className="px-4 py-3 font-medium">Plate</th>
                <th className="px-4 py-3 font-medium">Severity</th>
                <th className="px-4 py-3 font-medium">Driver</th>
                <th className="px-4 py-3 font-medium text-right">Points</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {collisionData.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 text-center font-bold text-slate-500">{item.id}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900">{item.date}</div>
                    <div className="text-[10px] text-slate-400">{item.entered}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-800">{item.doc}</div>
                    <div className="text-[10px] text-slate-500">{item.location}</div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium">{item.jur}</span>
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-800">{item.plate}</td>
                  <td className="px-4 py-3">
                    <span className={inline-flex rounded px-2 py-1 text-[10px] font-bold uppercase \}>{item.severity}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-800">{item.driver}</div>
                    <div className="text-[10px] text-slate-500">{item.status}</div>
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-slate-700">{item.points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
'''
with open('src/pages/inspections/BcPanels.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("done")
