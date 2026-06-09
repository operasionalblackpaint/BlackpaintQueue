export interface Order {
  id_order: string;          // Unique document ID in Firebase (e.g. ORD-12345-1)
  id_parent_order?: string;  // Shared transaction ID for multi-item (e.g. ORD-12345)
  nama_customer: string;
  nama_produk: string;
  jumlah: number;
  tanggal_input: string;     // ISO date string
  datetime_deadline: string; // ISO date string
  status_rute_sekarang: number; // Index in the active route
  status_kendala: boolean;
  jenis_kendala?: 'Mesin Eror' | 'Bahan Rusak' | 'File Corrupt' | '';
  is_booster: boolean;
  notes?: string;
  link_file_desain?: string; // Real-time link to file/cloud storage
  is_archived?: boolean;
  alur_divisi?: string[];    // Snapshot of route divisions flow stored in DB
  tanggal_update_rute?: string; // ISO date string of the last operational handoff or route step change
  nama_approve?: string;      // Selector value for Admin Approve name
  acc_operator?: string;      // Manual typed input for ACC Operator
  is_pending?: boolean;       // Status pending/temporary stop for active order
}

export interface AdminApprover {
  id: string;
  nama: string;
}

export interface RouteDetail {
  id: string;
  name: string;
  divisions: string[];
}

// Map each of the 20 divisions to their respective workstations for fast indexing and visual [Workstation -> Division] rendering.
export interface DivisiBaru {
  id: string; // Division ID name
  name: string; // Readable name
  workstation: 'Workstation Blackpaint' | 'Workstation Reseller' | 'Workstation Folder';
}

export const ALL_DIVISIONS: DivisiBaru[] = [
  // 1. Workstation Blackpaint - 8 Divisions
  { id: 'Bordir', name: 'Bordir', workstation: 'Workstation Blackpaint' },
  { id: 'Cutting', name: 'Cutting', workstation: 'Workstation Blackpaint' },
  { id: 'Faktur', name: 'Faktur', workstation: 'Workstation Blackpaint' },
  { id: 'Highres', name: 'Highres', workstation: 'Workstation Blackpaint' },
  { id: 'Laser', name: 'Laser', workstation: 'Workstation Blackpaint' },
  { id: 'Souvenir', name: 'Souvenir', workstation: 'Workstation Blackpaint' },
  { id: 'Spanduk', name: 'Spanduk', workstation: 'Workstation Blackpaint' },
  { id: 'Uv', name: 'Uv', workstation: 'Workstation Blackpaint' },

  // 2. Workstation Reseller - 4 Divisions
  { id: 'Cutting Reseller', name: 'Cutting Reseller', workstation: 'Workstation Reseller' },
  { id: 'Highres Reseller', name: 'Highres Reseller', workstation: 'Workstation Reseller' },
  { id: 'Laser Reseller', name: 'Laser Reseller', workstation: 'Workstation Reseller' },
  { id: 'Spanduk Reseller', name: 'Spanduk Reseller', workstation: 'Workstation Reseller' },

  // 3. Workstation Folder - 7 Divisions
  { id: 'Laser Cutting', name: 'Laser Cutting', workstation: 'Workstation Folder' },
  { id: 'Direct Sublim', name: 'Direct Sublim', workstation: 'Workstation Folder' },
  { id: 'DTF', name: 'DTF', workstation: 'Workstation Folder' },
  { id: 'Jahit', name: 'Jahit', workstation: 'Workstation Folder' },
  { id: 'Sublim', name: 'Sublim', workstation: 'Workstation Folder' },
  { id: 'Sublim Press', name: 'Sublim Press', workstation: 'Workstation Folder' },
  { id: 'Sablon', name: 'Sablon', workstation: 'Workstation Folder' }
];

// Helper to find workstation of a division
export function getWorkstationByDivision(divisionName: string): string {
  const div = ALL_DIVISIONS.find(d => d.id.toLowerCase() === divisionName.toLowerCase());
  return div ? div.workstation : 'Workstation Umum';
}

// Estafet Rute templates - initialized empty, all routes are retrieved from Database
export const PRODUCT_ROUTES: Record<string, RouteDetail> = {};

// Map product names to their specific route templates - initialized empty
export const PRODUCT_ROUTE_MAPPING: Record<string, string> = {};

// List of products grouped or flat for the select dropdown - initialized empty
export const PRODUCT_LIST: string[] = [];

export interface Divisi {
  id: string;
  name: string;
}

export interface MasterRuteProduk {
  id_produk: string;
  nama_produk: string;
  alur_divisi: string[];
}

export const DIVISI_LIST: Divisi[] = ALL_DIVISIONS.map(d => ({
  id: d.id,
  name: `${d.name} (${d.workstation.replace('Workstation ', '')})`
}));
