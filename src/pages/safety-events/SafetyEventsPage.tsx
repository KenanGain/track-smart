import { useState } from 'react';
import { 
  AlertTriangle, 
  MapPin, 
  Clock, 
  Truck, 
  User, 
  Camera, 
  CloudRain, 
  Activity, 
  Info,
  Map,
  ChevronDown,
  ChevronUp,
  X,
  Zap,
  Gauge,
  CornerDownRight,
  ShieldAlert,
} from 'lucide-react';
import { DataListToolbar, PaginationBar, type ColumnDef } from '@/components/ui/DataListToolbar';

// ===== RAW DATA =====
const RAW_DATA = {
  "results": [
    {
      "id": "sft_evt_01D8ZQFGHVJ858NBF2Q7DV9MNC",
      "sourceId": "123456789",
      "provider": "geotab",
      "type": "harsh_brake",
      "vehicle": "vcl_01D8ZQFGHVJ858NBF2Q7DV9MNC",
      "vehiclePlate": "P-7762",
      "startedAt": "2025-01-06T03:24:53.000Z",
      "metadata": { "addedAt": "2025-01-07T05:31:56Z", "modifiedAt": "2025-01-07T05:31:56Z" },
      "sourceType": "HARD_CORE_BRAKING_MESSAGE",
      "driver": "drv_01D8ZQFGHVJ858NBF2Q7DV9MNC",
      "driverName": "John Smith",
      "startLocation": { "longitude": -122.4194155, "latitude": 37.7749295 },
      "endedAt": "2025-01-06T03:24:53.000Z",
      "endLocation": { "longitude": -122.4194155, "latitude": 37.7749295 },
      "stats": { "maximumSpeed": 95.33, "averageSpeed": 95.33, "roadSpeedLimit": 95.33, "gForceForwardBackward": 1, "gForceSideToSide": 1, "heading": 25 },
      "cameraMedia": { "frontFacing": { "available": true, "sourceId": "12345" }, "rearFacing": { "available": true, "sourceId": "12345" } },
      "extensions": { "here": { "speedLimit": 95.33, "speedLimitSource": "posted", "truckSpeedLimit": 95.33, "roadName": "John St", "linkAttributes": { "countryCode": "US", "isUrban": "true", "isPaved": "true" }, "weather": { "temperature": 68, "humidity": 45, "visibility": 1000 } } },
      "severity": "high",
      "raw": []
    },
    {
      "id": "sft_evt_99X1ZQFGHVJ858NBF2Q7DV9ABC",
      "sourceId": "987654321",
      "provider": "samsara",
      "type": "over_speed",
      "vehicle": "vcl_99X1ZQFGHVJ858NBF2Q7DV9ABC",
      "vehiclePlate": "BIG-RIG7",
      "startedAt": "2025-05-14T14:12:10.000Z",
      "metadata": { "addedAt": "2025-05-15T05:35:00Z", "modifiedAt": "2025-05-15T05:35:00Z" },
      "sourceType": "SPEEDING_ALERT",
      "driver": "drv_44B2ZQFGHVJ858NBF2Q7DV9XYZ",
      "driverName": "Robert Chen",
      "startLocation": { "longitude": -74.0060, "latitude": 40.7128 },
      "endedAt": "2025-05-14T14:15:30.000Z",
      "endLocation": { "longitude": -74.0150, "latitude": 40.7200 },
      "stats": { "maximumSpeed": 112.5, "averageSpeed": 105.0, "roadSpeedLimit": 80.0, "gForceForwardBackward": 0.2, "gForceSideToSide": 0.1, "heading": 180 },
      "cameraMedia": { "frontFacing": { "available": true, "sourceId": "cam_888" }, "rearFacing": { "available": false, "sourceId": null } },
      "extensions": { "here": { "speedLimit": 80.0, "speedLimitSource": "posted", "truckSpeedLimit": 80.0, "roadName": "I-95 North", "linkAttributes": { "countryCode": "US", "isUrban": "false", "isDivided": "true" }, "weather": { "temperature": 75, "precipitationType": "rain", "visibility": 500 } } },
      "severity": "critical",
      "raw": []
    },
    {
      "id": "sft_evt_33P8ZQFGHVJ858NBF2Q7DV9QWE",
      "sourceId": "555666777",
      "provider": "motive",
      "type": "harsh_cornering",
      "vehicle": "vcl_11A2ZQFGHVJ858NBF2Q7DV9123",
      "vehiclePlate": "TANK-01",
      "startedAt": "2025-08-21T09:45:00.000Z",
      "metadata": { "addedAt": "2025-08-22T06:00:00Z", "modifiedAt": "2025-08-22T06:00:00Z" },
      "sourceType": "LATERAL_G_FORCE",
      "driver": "drv_77D4ZQFGHVJ858NBF2Q7DV9789",
      "driverName": "James Sullivan",
      "startLocation": { "longitude": -118.2437, "latitude": 34.0522 },
      "endedAt": "2025-08-21T09:45:05.000Z",
      "endLocation": { "longitude": -118.2440, "latitude": 34.0530 },
      "stats": { "maximumSpeed": 65.0, "averageSpeed": 60.0, "roadSpeedLimit": 50.0, "gForceForwardBackward": 0.1, "gForceSideToSide": 1.4, "heading": 90 },
      "cameraMedia": { "frontFacing": { "available": false, "sourceId": null }, "rearFacing": { "available": false, "sourceId": null } },
      "extensions": { "here": { "speedLimit": 50.0, "speedLimitSource": "inferred", "truckSpeedLimit": 50.0, "roadName": "Sunset Blvd", "linkAttributes": { "countryCode": "US", "isUrban": "true", "intersectionCategory": "roundabout" }, "weather": { "temperature": 85, "humidity": 20, "visibility": 2000 } } },
      "severity": "medium",
      "raw": []
    },
    {
      "id": "sft_evt_55L9ZQFGHVJ858NBF2Q7DV9LKJ",
      "sourceId": "111222333",
      "provider": "lytx",
      "type": "collision_warning",
      "vehicle": "vcl_88K2ZQFGHVJ858NBF2Q7DV9POU",
      "vehiclePlate": "FLT-209",
      "startedAt": "2025-11-01T18:30:15.000Z",
      "metadata": { "addedAt": "2025-11-02T08:15:22Z", "modifiedAt": "2025-11-02T08:15:22Z" },
      "sourceType": "ADAS_FCW",
      "driver": "drv_22M1ZQFGHVJ858NBF2Q7DV9BNM",
      "driverName": "Mike Pearson",
      "startLocation": { "longitude": -87.6298, "latitude": 41.8781 },
      "endedAt": "2025-11-01T18:30:17.000Z",
      "endLocation": { "longitude": -87.6290, "latitude": 41.8785 },
      "stats": { "maximumSpeed": 88.2, "averageSpeed": 85.0, "roadSpeedLimit": 90.0, "gForceForwardBackward": 0.8, "gForceSideToSide": 0.0, "heading": 45 },
      "cameraMedia": { "frontFacing": { "available": true, "sourceId": "lytx_cam_01" }, "rearFacing": { "available": true, "sourceId": "lytx_cam_02" } },
      "extensions": { "here": { "speedLimit": 90.0, "speedLimitSource": "posted", "truckSpeedLimit": 85.0, "roadName": "Lake Shore Dr", "linkAttributes": { "countryCode": "US", "isUrban": "true", "isDivided": "true" }, "weather": { "temperature": 40, "windSpeed": 25, "precipitationType": "snow" } } },
      "severity": "critical",
      "raw": []
    }
  ]
};

// ===== Helper functions =====
const getEventTypeLabel = (type: string) => {
  const map: Record<string, string> = { 'harsh_brake': 'Harsh Brake', 'over_speed': 'Over Speed', 'harsh_cornering': 'Harsh Cornering', 'collision_warning': 'Collision Warning' };
  return map[type] || type.replace(/_/g, ' ');
};

const getEventTypeStyle = (type: string) => {
  switch (type) {
    case 'harsh_brake': return { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-200' };
    case 'over_speed': return { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200' };
    case 'harsh_cornering': return { bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-200' };
    case 'collision_warning': return { bg: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-200' };
    default: return { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200' };
  }
};

const getSeverityBadge = (severity: string) => {
  switch (severity) {
    case 'critical': return <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-50/80 rounded text-xs font-bold text-red-600 tracking-wide uppercase whitespace-nowrap"><ShieldAlert size={10} className="text-red-500 flex-shrink-0" /> CRITICAL</span>;
    case 'high': return <span className="inline-flex items-center px-2 py-0.5 bg-amber-50 rounded text-xs font-bold text-amber-600 tracking-wide uppercase whitespace-nowrap">HIGH</span>;
    case 'medium': return <span className="inline-flex items-center px-2 py-0.5 bg-yellow-50 rounded text-xs font-bold text-yellow-600 tracking-wide uppercase whitespace-nowrap">MEDIUM</span>;
    default: return <span className="inline-flex items-center px-2 py-0.5 bg-emerald-50 rounded text-xs font-bold text-emerald-600 tracking-wide uppercase whitespace-nowrap">LOW</span>;
  }
};

// ===== MiniKpiCard =====
const MiniKpiCard = ({ title, value, icon: Icon, active, onClick, color }: { title: string; value: number; icon: React.ElementType; active: boolean; onClick: () => void; color: "blue" | "emerald" | "red" | "yellow" | "purple" | "orange" | "gray" | "indigo" | "cyan" | "rose" | "teal" }) => {
  const colorMap = {
    blue: "text-blue-600 bg-blue-50 border-blue-200",
    emerald: "text-emerald-600 bg-emerald-50 border-emerald-200",
    red: "text-red-600 bg-red-50 border-red-200",
    yellow: "text-yellow-600 bg-yellow-50 border-yellow-200",
    purple: "text-purple-600 bg-purple-50 border-purple-200",
    orange: "text-orange-600 bg-orange-50 border-orange-200",
    gray: "text-slate-600 bg-slate-50 border-slate-200",
    rose: "text-rose-600 bg-rose-50 border-rose-200",
    teal: "text-teal-600 bg-teal-50 border-teal-200",
    indigo: "text-indigo-600 bg-indigo-50 border-indigo-200",
    cyan: "text-cyan-600 bg-cyan-50 border-cyan-200",
    fuchsia: "text-fuchsia-600 bg-fuchsia-50 border-fuchsia-200",
    violet: "text-violet-600 bg-violet-50 border-violet-200",
    lime: "text-lime-700 bg-lime-50 border-lime-200",
    amber: "text-amber-600 bg-amber-50 border-amber-200",
    slate: "text-slate-600 bg-slate-50 border-slate-200",
  } as const;

  const activeStylesMap = {
    blue: "ring-2 ring-offset-1 ring-blue-400 border-blue-400 shadow-sm",
    emerald: "ring-2 ring-offset-1 ring-emerald-400 border-emerald-400 shadow-sm",
    red: "ring-2 ring-offset-1 ring-red-400 border-red-400 shadow-sm",
    yellow: "ring-2 ring-offset-1 ring-yellow-400 border-yellow-400 shadow-sm",
    purple: "ring-2 ring-offset-1 ring-purple-400 border-purple-400 shadow-sm",
    orange: "ring-2 ring-offset-1 ring-orange-400 border-orange-400 shadow-sm",
    gray: "ring-2 ring-offset-1 ring-slate-400 border-slate-400 shadow-sm",
    rose: "ring-2 ring-offset-1 ring-rose-400 border-rose-400 shadow-sm",
    teal: "ring-2 ring-offset-1 ring-teal-400 border-teal-400 shadow-sm",
    indigo: "ring-2 ring-offset-1 ring-indigo-400 border-indigo-400 shadow-sm",
    cyan: "ring-2 ring-offset-1 ring-cyan-400 border-cyan-400 shadow-sm",
    fuchsia: "ring-2 ring-offset-1 ring-fuchsia-400 border-fuchsia-400 shadow-sm",
    violet: "ring-2 ring-offset-1 ring-violet-400 border-violet-400 shadow-sm",
    lime: "ring-2 ring-offset-1 ring-lime-400 border-lime-400 shadow-sm",
    amber: "ring-2 ring-offset-1 ring-amber-400 border-amber-400 shadow-sm",
    slate: "ring-2 ring-offset-1 ring-slate-400 border-slate-400 shadow-sm",
  } as const;

  const activeStyles = active
    ? activeStylesMap[color]
    : "border-slate-200 hover:border-slate-300 hover:bg-slate-50";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center justify-between p-3 rounded-lg border transition-all ${activeStyles} bg-white`}
    >
      <div className="flex items-center gap-3">
        <div className={`p-1.5 rounded-md ${colorMap[color]}`}>
          <Icon size={16} />
        </div>
        <span className="text-sm font-bold text-slate-600 uppercase tracking-wide">{title}</span>
      </div>
      <span className="text-lg font-bold text-slate-900">{value}</span>
    </button>
  );
};

// ===== Column definitions =====
const ALL_COLUMNS: ColumnDef[] = [
  { id: 'date', label: 'Date / Time', visible: true },
  { id: 'type', label: 'Event Type', visible: true },
  { id: 'location', label: 'Location', visible: true },
  { id: 'driver', label: 'Driver', visible: true },
  { id: 'vehicle', label: 'Vehicle / Plate', visible: true },
  { id: 'speed', label: 'Speed', visible: true },
  { id: 'gforce', label: 'G-Force', visible: true },
  { id: 'provider', label: 'Provider', visible: true },
  { id: 'severity', label: 'Severity', visible: true },
  { id: 'camera', label: 'Camera', visible: false },
  { id: 'id', label: 'Event ID', visible: false },
];

// ===== Sub-components for detail modal =====
const SectionHeader = ({ icon: Icon, title }: { icon: React.ElementType; title: string }) => (
  <h3 className="flex items-center text-sm font-semibold text-slate-700 uppercase tracking-wider mb-3 mt-4 border-b pb-2">
    <Icon className="w-4 h-4 mr-2 text-indigo-500" />
    {title}
  </h3>
);

const DataRow = ({ label, value }: { label: string; value: unknown }) => (
  <div className="flex flex-col sm:flex-row sm:justify-between py-1 text-sm border-b border-slate-50 last:border-0">
    <span className="text-slate-500 font-medium">{label}:</span>
    <span className="text-slate-900 break-all sm:text-right">{value?.toString() || 'N/A'}</span>
  </div>
);

const CollapsibleSection = ({ title, data, icon: Icon }: { title: string; data: Record<string, unknown>; icon?: React.ElementType }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="mt-4 border border-slate-200 rounded-lg overflow-hidden">
      <button onClick={() => setIsOpen(!isOpen)} className="w-full flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100 transition-colors">
        <div className="flex items-center text-sm font-semibold text-slate-700">
          {Icon && <Icon className="w-4 h-4 mr-2 text-slate-500" />}
          {title}
        </div>
        {isOpen ? <ChevronDown className="w-4 h-4 text-slate-500" /> : <ChevronUp className="w-4 h-4 text-slate-500 rotate-90" />}
      </button>
      {isOpen && (
        <div className="p-4 bg-white grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-2">
          {Object.entries(data).map(([key, value]) => (
            <DataRow key={key} label={key.replace(/([A-Z])/g, ' $1').replace(/^./, (s: string) => s.toUpperCase())} value={value} />
          ))}
        </div>
      )}
    </div>
  );
};

// ===== MAIN PAGE =====
export function SafetyEventsPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allEvents = RAW_DATA.results as any[];

  // State
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [columns, setColumns] = useState(ALL_COLUMNS);
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);

  // Column toggle
  const toggleColumn = (id: string) => setColumns(prev => prev.map(c => c.id === id ? { ...c, visible: !c.visible } : c));
  const isVisible = (id: string) => columns.find(c => c.id === id)?.visible ?? true;

  // Filter
  const filteredEvents = allEvents.filter(e => {
    const st = searchTerm.toLowerCase();
    const matchSearch = !st || e.driverName.toLowerCase().includes(st) || e.vehiclePlate.toLowerCase().includes(st) || e.id.toLowerCase().includes(st) || e.extensions.here.roadName.toLowerCase().includes(st);
    let matchFilter = true;
    switch (activeFilter) {
      case 'HARSH_BRAKE': matchFilter = e.type === 'harsh_brake'; break;
      case 'OVER_SPEED': matchFilter = e.type === 'over_speed'; break;
      case 'CORNERING': matchFilter = e.type === 'harsh_cornering'; break;
      case 'COLLISION': matchFilter = e.type === 'collision_warning'; break;
      case 'CRITICAL': matchFilter = e.severity === 'critical'; break;
      case 'CAMERA': matchFilter = e.cameraMedia.frontFacing.available || e.cameraMedia.rearFacing.available; break;
    }
    return matchSearch && matchFilter;
  });

  // Pagination
  const paginatedEvents = filteredEvents.slice((page - 1) * rowsPerPage, page * rowsPerPage);

  // Stats
  const stats = {
    total: allEvents.length,
    harshBrake: allEvents.filter(e => e.type === 'harsh_brake').length,
    overSpeed: allEvents.filter(e => e.type === 'over_speed').length,
    cornering: allEvents.filter(e => e.type === 'harsh_cornering').length,
    collision: allEvents.filter(e => e.type === 'collision_warning').length,
    critical: allEvents.filter(e => e.severity === 'critical').length,
    withCamera: allEvents.filter(e => e.cameraMedia.frontFacing.available || e.cameraMedia.rearFacing.available).length,
  };

  return (
    <div className="flex-1 bg-slate-50 min-h-screen">
      <div className="max-w-[1600px] mx-auto p-4 md:p-6 lg:p-8">

        {/* Page Header */}
        <div className="mb-5">
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
            <div className="w-9 h-9 bg-indigo-100 rounded-lg flex items-center justify-center">
              <Activity className="w-5 h-5 text-indigo-600" />
            </div>
            Safety Events
          </h1>
          <p className="text-slate-500 mt-1 text-sm">Telemetry-based safety events from fleet devices &amp; terminals</p>
        </div>

        {/* ===== KPI FILTER CARDS ===== */}
        <div className="mt-8">
          <h3 className="text-[13px] font-bold text-slate-500 uppercase tracking-wider mb-3">Event Filters</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3">
            <MiniKpiCard title="All Events" value={stats.total} icon={Activity} active={activeFilter === 'ALL'} onClick={() => { setActiveFilter('ALL'); setPage(1); }} color="blue" />
            <MiniKpiCard title="Harsh Brake" value={stats.harshBrake} icon={Zap} active={activeFilter === 'HARSH_BRAKE'} onClick={() => { setActiveFilter('HARSH_BRAKE'); setPage(1); }} color="red" />
            <MiniKpiCard title="Over Speed" value={stats.overSpeed} icon={Gauge} active={activeFilter === 'OVER_SPEED'} onClick={() => { setActiveFilter('OVER_SPEED'); setPage(1); }} color="yellow" />
            <MiniKpiCard title="Cornering" value={stats.cornering} icon={CornerDownRight} active={activeFilter === 'CORNERING'} onClick={() => { setActiveFilter('CORNERING'); setPage(1); }} color="orange" />
            <MiniKpiCard title="Collision" value={stats.collision} icon={AlertTriangle} active={activeFilter === 'COLLISION'} onClick={() => { setActiveFilter('COLLISION'); setPage(1); }} color="rose" />
            <MiniKpiCard title="Critical" value={stats.critical} icon={ShieldAlert} active={activeFilter === 'CRITICAL'} onClick={() => { setActiveFilter('CRITICAL'); setPage(1); }} color="rose" />
            <MiniKpiCard title="Camera" value={stats.withCamera} icon={Camera} active={activeFilter === 'CAMERA'} onClick={() => { setActiveFilter('CAMERA'); setPage(1); }} color="indigo" />
          </div>
        </div>

        {/* ===== DATA TABLE ===== */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">

          {/* Toolbar: Search + Columns */}
          <DataListToolbar
            searchValue={searchTerm}
            onSearchChange={(v) => { setSearchTerm(v); setPage(1); }}
            searchPlaceholder="Search by Driver, Plate, Road..."
            columns={columns}
            onToggleColumn={toggleColumn}
            totalItems={filteredEvents.length}
            currentPage={page}
            rowsPerPage={rowsPerPage}
            onPageChange={setPage}
            onRowsPerPageChange={(r) => { setRowsPerPage(r); setPage(1); }}
          />

          {/* Table Header */}
          <div className="hidden md:grid grid-cols-12 gap-x-2 px-4 py-2.5 bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            {isVisible('date') && <div className="col-span-2">Date / Time</div>}
            {isVisible('type') && <div className="col-span-1">Type</div>}
            {isVisible('location') && <div className="col-span-1">Location</div>}
            {isVisible('driver') && <div className="col-span-1">Driver</div>}
            {isVisible('vehicle') && <div className="col-span-1">Vehicle</div>}
            {isVisible('speed') && <div className="col-span-2 text-center">Max / Limit</div>}
            {isVisible('gforce') && <div className="col-span-1 text-center">G-Force</div>}
            {isVisible('provider') && <div className="col-span-1 text-center">Provider</div>}
            {isVisible('severity') && <div className="col-span-1 text-center">Severity</div>}
            <div className="col-span-1"></div>
          </div>

          {/* Table Rows */}
          <div className="divide-y divide-slate-100">
            {paginatedEvents.length === 0 ? (
              <div className="text-center py-16 text-slate-400">
                <Activity size={32} className="mx-auto mb-3 opacity-40" />
                <p className="font-semibold">No events found</p>
                <p className="text-sm mt-1">Try adjusting your filters or search term</p>
              </div>
            ) : paginatedEvents.map(event => {
              const isExpanded = expandedId === event.id;
              const typeStyle = getEventTypeStyle(event.type);
              const d = new Date(event.startedAt);
              const overLimit = event.stats.maximumSpeed > event.stats.roadSpeedLimit;

              return (
                <div key={event.id} className="group">
                  {/* Main Row */}
                  <div
                    className={`hidden md:grid grid-cols-12 gap-x-2 px-4 py-3 items-center cursor-pointer hover:bg-slate-50/50 transition-colors ${isExpanded ? 'bg-indigo-50/30' : ''}`}
                    onClick={() => setExpandedId(isExpanded ? null : event.id)}
                  >
                    {/* Date/Time */}
                    {isVisible('date') && (
                      <div className="col-span-2 flex flex-col">
                        <span className="text-sm font-bold text-slate-800">{d.toLocaleDateString('en-CA')}</span>
                        <span className="text-[10px] text-slate-400 font-mono mt-0.5">{d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    )}

                    {/* Type */}
                    {isVisible('type') && (
                      <div className="col-span-1">
                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${typeStyle.bg} ${typeStyle.text} ${typeStyle.border}`}>
                          {getEventTypeLabel(event.type).substring(0, 8)}…
                        </span>
                      </div>
                    )}

                    {/* Location */}
                    {isVisible('location') && (
                      <div className="col-span-1 truncate">
                        <span className="text-sm font-semibold text-slate-800 truncate block" title={event.extensions.here.roadName}>{event.extensions.here.roadName}</span>
                      </div>
                    )}

                    {/* Driver */}
                    {isVisible('driver') && (
                      <div className="col-span-1 truncate">
                        <span className="text-sm font-medium text-slate-800 truncate block">{event.driverName}</span>
                      </div>
                    )}

                    {/* Vehicle */}
                    {isVisible('vehicle') && (
                      <div className="col-span-1">
                        <span className="text-sm font-bold text-slate-800">{event.vehiclePlate}</span>
                      </div>
                    )}

                    {/* Speed */}
                    {isVisible('speed') && (
                      <div className="col-span-2 text-center">
                        <span className={`text-sm font-bold font-mono ${overLimit ? 'text-red-600' : 'text-slate-700'}`}>{event.stats.maximumSpeed}</span>
                        <span className="text-xs text-slate-400 mx-1">/</span>
                        <span className="text-sm font-mono text-slate-500">{event.stats.roadSpeedLimit}</span>
                        <span className="text-[10px] text-slate-400 ml-0.5">km/h</span>
                      </div>
                    )}

                    {/* G-Force */}
                    {isVisible('gforce') && (
                      <div className="col-span-1 text-center">
                        <span className={`text-sm font-bold font-mono ${Math.max(event.stats.gForceForwardBackward, event.stats.gForceSideToSide) >= 0.8 ? 'text-red-600' : 'text-slate-600'}`}>
                          {Math.max(event.stats.gForceForwardBackward, event.stats.gForceSideToSide).toFixed(1)}g
                        </span>
                      </div>
                    )}

                    {/* Provider */}
                    {isVisible('provider') && (
                      <div className="col-span-1 text-center">
                        <span className="uppercase text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">{event.provider}</span>
                      </div>
                    )}

                    {/* Severity */}
                    {isVisible('severity') && (
                      <div className="col-span-1 flex justify-center">
                        {getSeverityBadge(event.severity)}
                      </div>
                    )}

                    {/* Expand */}
                    <div className="col-span-1 flex items-center justify-end">
                      <div className="w-5 h-5 flex items-center justify-center text-slate-400">
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </div>
                    </div>
                  </div>

                  {/* Mobile Row */}
                  <div
                    className="md:hidden px-4 py-3 cursor-pointer hover:bg-slate-50/50"
                    onClick={() => setExpandedId(isExpanded ? null : event.id)}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${typeStyle.bg} ${typeStyle.text} ${typeStyle.border}`}>
                          {getEventTypeLabel(event.type)}
                        </span>
                        <p className="text-sm font-bold text-slate-800 mt-1">{event.driverName} · {event.vehiclePlate}</p>
                        <p className="text-xs text-slate-500">{event.extensions.here.roadName} · {d.toLocaleDateString()}</p>
                      </div>
                      {getSeverityBadge(event.severity)}
                    </div>
                  </div>

                  {/* Expanded Detail */}
                  {isExpanded && (
                    <div className="bg-slate-50/50 p-4 md:p-6 border-t border-slate-200 shadow-inner">
                      {/* Info Banner */}
                      <div className={`flex items-center gap-3 px-4 py-2.5 rounded-lg border ${typeStyle.bg} ${typeStyle.border} mb-4`}>
                        <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider border ${typeStyle.bg} ${typeStyle.text} ${typeStyle.border}`}>
                          {getEventTypeLabel(event.type)}
                        </span>
                        <span className="text-sm text-slate-700">
                          Source: <span className="font-bold uppercase">{event.provider}</span> — {event.sourceType}
                        </span>
                      </div>

                      {/* Info Cards Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3 mb-4">
                        <div className="bg-white border border-slate-200 rounded-lg p-3 text-center">
                          <div className="text-[11px] text-slate-500 uppercase tracking-wider font-bold">Time</div>
                          <div className="font-mono font-bold text-slate-900 text-sm mt-0.5">{d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</div>
                        </div>
                        <div className="bg-white border border-slate-200 rounded-lg p-3 text-center">
                          <div className="text-[11px] text-slate-500 uppercase tracking-wider font-bold">Location</div>
                          <div className="font-bold text-slate-900 text-sm mt-0.5">{event.extensions.here.roadName}</div>
                        </div>
                        <div className="bg-white border border-slate-200 rounded-lg p-3 text-center">
                          <div className="text-[11px] text-slate-500 uppercase tracking-wider font-bold">Max Speed</div>
                          <div className={`font-mono font-bold text-sm mt-0.5 ${overLimit ? 'text-red-600' : 'text-slate-900'}`}>{event.stats.maximumSpeed} km/h</div>
                        </div>
                        <div className="bg-white border border-slate-200 rounded-lg p-3 text-center">
                          <div className="text-[11px] text-slate-500 uppercase tracking-wider font-bold">Speed Limit</div>
                          <div className="font-mono font-bold text-slate-900 text-sm mt-0.5">{event.stats.roadSpeedLimit} km/h</div>
                        </div>
                        <div className="bg-white border border-slate-200 rounded-lg p-3 text-center">
                          <div className="text-[11px] text-slate-500 uppercase tracking-wider font-bold">G-Force</div>
                          <div className="font-mono font-bold text-slate-900 text-sm mt-0.5">F/B: {event.stats.gForceForwardBackward} | S: {event.stats.gForceSideToSide}</div>
                        </div>
                      </div>

                      {/* Detail Cards */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {/* Driver & Vehicle */}
                        <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-4">
                          <h4 className="text-xs font-bold text-slate-500 flex items-center gap-2 uppercase tracking-wider mb-3"><User size={14} className="text-slate-400" /> Driver & Vehicle</h4>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between"><span className="text-slate-500">Driver</span><span className="font-semibold text-slate-900">{event.driverName}</span></div>
                            <div className="flex justify-between"><span className="text-slate-500">Driver ID</span><span className="font-mono text-xs text-slate-700">{event.driver}</span></div>
                            <div className="flex justify-between"><span className="text-slate-500">Vehicle Plate</span><span className="font-bold text-slate-900">{event.vehiclePlate}</span></div>
                            <div className="flex justify-between"><span className="text-slate-500">Vehicle ID</span><span className="font-mono text-xs text-slate-700">{event.vehicle}</span></div>
                          </div>
                        </div>

                        {/* Location & Media */}
                        <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-4">
                          <h4 className="text-xs font-bold text-slate-500 flex items-center gap-2 uppercase tracking-wider mb-3"><MapPin size={14} className="text-slate-400" /> Location & Media</h4>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between"><span className="text-slate-500">Road</span><span className="font-semibold text-slate-900">{event.extensions.here.roadName}</span></div>
                            <div className="flex justify-between"><span className="text-slate-500">Coordinates</span><span className="font-mono text-xs text-slate-700">{event.startLocation.latitude.toFixed(4)}, {event.startLocation.longitude.toFixed(4)}</span></div>
                            <div className="flex justify-between"><span className="text-slate-500">Front Camera</span><span className={event.cameraMedia.frontFacing.available ? 'text-emerald-600 font-bold' : 'text-slate-400'}>{event.cameraMedia.frontFacing.available ? '✓ Available' : '✗ N/A'}</span></div>
                            <div className="flex justify-between"><span className="text-slate-500">Rear Camera</span><span className={event.cameraMedia.rearFacing.available ? 'text-emerald-600 font-bold' : 'text-slate-400'}>{event.cameraMedia.rearFacing.available ? '✓ Available' : '✗ N/A'}</span></div>
                          </div>
                        </div>
                      </div>

                      {/* View Full Details button */}
                      <div className="mt-4 text-center">
                        <button
                          onClick={(e) => { e.stopPropagation(); setSelectedEvent(event); }}
                          className="px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-sm"
                        >
                          View Full Event Details
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Empty state with clear */}
          {filteredEvents.length > 0 && filteredEvents.length !== allEvents.length && (
            <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 flex justify-center">
              <button onClick={() => { setSearchTerm(''); setActiveFilter('ALL'); }} className="bg-white text-blue-600 border border-blue-200 px-4 py-2 rounded-lg font-bold hover:bg-blue-50 transition-colors text-sm shadow-sm">Clear all filters</button>
            </div>
          )}

          {/* Pagination */}
          <PaginationBar
            totalItems={filteredEvents.length}
            currentPage={page}
            rowsPerPage={rowsPerPage}
            onPageChange={setPage}
            onRowsPerPageChange={(r) => { setRowsPerPage(r); setPage(1); }}
          />
        </div>

        {/* ===== FULL DETAIL MODAL ===== */}
        {selectedEvent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setSelectedEvent(null)}></div>
            <div className="relative bg-white w-full max-w-5xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
              {/* Modal Header */}
              <div className="flex-none bg-slate-50 border-b border-slate-200 p-4 md:p-6 flex justify-between items-center">
                <div className="flex items-center">
                  <div className={`p-2 rounded-full mr-4 ${getEventTypeStyle(selectedEvent.type).bg} ${getEventTypeStyle(selectedEvent.type).text}`}>
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 capitalize flex items-center gap-3">
                      {getEventTypeLabel(selectedEvent.type)}
                      <span className="px-2 py-0.5 bg-indigo-100 border border-indigo-200 rounded text-xs font-bold text-indigo-700 uppercase">{selectedEvent.provider}</span>
                    </h2>
                    <p className="text-sm text-slate-500 font-mono mt-1">ID: {selectedEvent.id}</p>
                  </div>
                </div>
                <button onClick={() => setSelectedEvent(null)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"><X className="w-6 h-6" /></button>
              </div>
              {/* Modal Body */}
              <div className="flex-1 overflow-y-auto p-4 md:p-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div>
                    <SectionHeader icon={Info} title="Event Details" />
                    <DataRow label="Source Type" value={selectedEvent.sourceType} />
                    <DataRow label="Source ID" value={selectedEvent.sourceId} />
                    <DataRow label="Severity" value={selectedEvent.severity} />
                    <div className="mt-4">
                      <SectionHeader icon={Clock} title="Timeline" />
                      <DataRow label="Started At" value={new Date(selectedEvent.startedAt).toLocaleString()} />
                      <DataRow label="Ended At" value={new Date(selectedEvent.endedAt).toLocaleString()} />
                      <DataRow label="System Added" value={new Date(selectedEvent.metadata.addedAt).toLocaleString()} />
                    </div>
                  </div>
                  <div>
                    <SectionHeader icon={User} title="Entities" />
                    <div className="flex items-center space-x-2 py-1"><Truck className="w-4 h-4 text-slate-400" /><span className="text-sm text-slate-900">{selectedEvent.driverName} ({selectedEvent.vehiclePlate})</span></div>
                    <DataRow label="Driver ID" value={selectedEvent.driver} />
                    <DataRow label="Vehicle ID" value={selectedEvent.vehicle} />
                    <SectionHeader icon={MapPin} title="Locations" />
                    <DataRow label="Start" value={`${selectedEvent.startLocation.latitude.toFixed(4)}, ${selectedEvent.startLocation.longitude.toFixed(4)}`} />
                    <DataRow label="End" value={`${selectedEvent.endLocation.latitude.toFixed(4)}, ${selectedEvent.endLocation.longitude.toFixed(4)}`} />
                  </div>
                  <div>
                    <SectionHeader icon={Activity} title="Telemetry Stats" />
                    <DataRow label="Max Speed" value={`${selectedEvent.stats.maximumSpeed} km/h`} />
                    <DataRow label="Avg Speed" value={`${selectedEvent.stats.averageSpeed} km/h`} />
                    <DataRow label="Speed Limit" value={`${selectedEvent.stats.roadSpeedLimit} km/h`} />
                    <DataRow label="G-Force (F/B)" value={selectedEvent.stats.gForceForwardBackward} />
                    <DataRow label="G-Force (S/S)" value={selectedEvent.stats.gForceSideToSide} />
                    <DataRow label="Heading" value={`${selectedEvent.stats.heading}°`} />
                    <SectionHeader icon={Camera} title="Media" />
                    <DataRow label="Front Camera" value={selectedEvent.cameraMedia.frontFacing.available ? '✓ Available' : '✗ N/A'} />
                    <DataRow label="Rear Camera" value={selectedEvent.cameraMedia.rearFacing.available ? '✓ Available' : '✗ N/A'} />
                  </div>
                </div>
                <div className="mt-8 pt-6 border-t border-slate-200">
                  <SectionHeader icon={Map} title="HERE Maps Extensions" />
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    {[
                      { label: 'Road Name', value: selectedEvent.extensions.here.roadName },
                      { label: 'Speed Limit Source', value: selectedEvent.extensions.here.speedLimitSource },
                      { label: 'Speed Limit', value: selectedEvent.extensions.here.speedLimit },
                      { label: 'Truck Speed Limit', value: selectedEvent.extensions.here.truckSpeedLimit },
                    ].map(item => (
                      <div key={item.label} className="bg-slate-50 p-3 rounded-lg border border-slate-200 shadow-sm">
                        <p className="text-xs text-slate-500 uppercase font-semibold mb-1">{item.label}</p>
                        <p className="font-bold text-slate-900 text-lg capitalize">{item.value}</p>
                      </div>
                    ))}
                  </div>
                  <CollapsibleSection icon={MapPin} title="Link Attributes" data={selectedEvent.extensions.here.linkAttributes} />
                  <CollapsibleSection icon={CloudRain} title="Weather Data" data={selectedEvent.extensions.here.weather} />
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
