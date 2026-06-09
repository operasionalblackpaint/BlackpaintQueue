import React, { useState, useEffect, useMemo } from 'react';
import {
  Workflow,
  PlusCircle,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Lock,
  ArrowRight,
  Computer,
  Zap,
  Sparkles,
  Copy,
  Check,
  FileCode,
  Sliders,
  RotateCcw,
  Volume2,
  Trash2,
  Layers,
  Edit2,
  Search,
  Save,
  Tv,
  Archive,
  Download,
  Play,
  Pause
} from 'lucide-react';
import {
  Order,
  PRODUCT_ROUTES,
  PRODUCT_ROUTE_MAPPING,
  PRODUCT_LIST,
  DIVISI_LIST,
  MasterRuteProduk,
  ALL_DIVISIONS,
  getWorkstationByDivision,
  AdminApprover
} from './types';
import { DART_RESOURCES } from './dartResources';
import { collection, doc, setDoc, deleteDoc, onSnapshot, writeBatch } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import { motion, AnimatePresence } from 'motion/react';

interface OrderNotification {
  id: string;
  orderId: string;
  custName: string;
  itemsCount: number;
  timestamp: string;
  isBooster: boolean;
}

export default function App() {
  /*
   * =========================================================================
   * FIREBASE CONFIGURATION GUIDE (INTEGRASI REAL-TIME & MULTIPLATFORM)
   * =========================================================================
   * Aplikasi ini sudah terhubung sepenuhnya secara real-time via Cloud Firestore.
   * Jika Anda mengunduh kode ini dan ingin menggunakan proyek Firebase Anda sendiri,
   * silakan update kredensial di file `/firebase-applet-config.json` atau gunakan format:
   * 
   * const firebaseConfigUserDefined = {
   *   apiKey: "YOUR_API_KEY_HERE",
   *   authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
   *   projectId: "YOUR_PROJECT_ID",
   *   storageBucket: "YOUR_PROJECT_ID.appspot.com",
   *   messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
   *   appId: "YOUR_APP_ID",
   *   databaseURL: "YOUR_DATABASE_URL_HERE_IF_RTDB"
   * };
   * 
   * Saat ini, aplikasi menggunakan sub-layanan Firestore reactive streaming yang otomatis
   * sinkron di semua tab, browser, HP admin, laptop operator, dan TV Display secara instan!
   * =========================================================================
   */

  // Setup primary orders state initialized from memory states or optional localStorage safely
  const [orders, setOrders] = useState<Order[]>([]);

  // Master Route Database
  const [masterRoutes, setMasterRoutes] = useState<MasterRuteProduk[]>([]);

  // Tick for countdown updates
  const [now, setNow] = useState<Date>(new Date());
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Real-time synchronization for all devices viewing 'prod_queue_orders'
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'prod_queue_orders'), (snapshot) => {
      const list: Order[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        list.push({
          ...data,
          id_order: data.id_order || docSnap.id,
        } as Order);
      });
      // Sort in reverse order of input timestamp (newest on top)
      const sortedList = [...list].sort((a, b) => new Date(b.tanggal_input).getTime() - new Date(a.tanggal_input).getTime());
      setOrders(sortedList);
      try {
        localStorage.setItem('blackpaint_orders', JSON.stringify(sortedList));
      } catch (err) {
        // Silently skip write blocks in browser preview sandboxes
      }
    }, (error) => {
      console.warn("Firestore live sync list skipped of read restriction or network offline:", error);
    });

    return () => unsub();
  }, []);

  // Sync state changes to localStorage safely in memory of browser
  useEffect(() => {
    try {
      localStorage.setItem('blackpaint_orders', JSON.stringify(orders));
    } catch (err) {
      // Quietly ignore if localStorage is blocked/sandboxed
    }
  }, [orders]);

  // Real-time sync for master routes
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'master_rute_produk'), (snapshot) => {
      const list: MasterRuteProduk[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        list.push({
          ...data,
          id_produk: data.id_produk || docSnap.id,
        } as MasterRuteProduk);
      });
      
      const sortedList = [...list].sort((a, b) => a.nama_produk.localeCompare(b.nama_produk));
      setMasterRoutes(sortedList);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'master_rute_produk');
    });

    return () => unsub();
  }, []);

  // Real-time sync for admin approvers
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'master_admin_approvers'), (snapshot) => {
      const list: AdminApprover[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        list.push({
          id: docSnap.id,
          nama: data.nama || '',
        } as AdminApprover);
      });
      const sortedList = [...list].sort((a, b) => a.nama.localeCompare(b.nama));
      setAdminApprovers(sortedList);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'master_admin_approvers');
    });

    return () => unsub();
  }, []);

  // Auth User state
  const [userRole, setUserRole] = useState<
    | 'Operational'
    | 'Admin'
    | 'Operator Workstation Blackpaint'
    | 'Operator Workstation Reseller'
    | 'Operator Workstation Folder'
    | 'Display Monitoring Admin'
  >('Admin'); // Default to Admin instead of Operational for security

  const getUserEmail = (role: string) => {
    switch (role) {
      case 'Operational':
        return 'operasionalblackpaint@gmail.com';
      case 'Admin':
        return 'admin@gmail.com';
      case 'Operator Workstation Blackpaint':
        return 'operator.blackpaint@gmail.com';
      case 'Operator Workstation Reseller':
        return 'operator.reseller@gmail.com';
      case 'Operator Workstation Folder':
        return 'operator.folder@gmail.com';
      case 'Display Monitoring Admin':
        return 'monitoring@gmail.com';
      default:
        return 'operasionalblackpaint@gmail.com';
    }
  };

  const userEmail = getUserEmail(userRole);

  // Master Rute UI Form state
  const [newRouteName, setNewRouteName] = useState('');
  const [newRouteDivisions, setNewRouteDivisions] = useState<string[]>(['Cutting']);
  const [editingRouteId, setEditingRouteId] = useState<string | null>(null);
  const [editRouteName, setEditRouteName] = useState('');
  const [editRouteDivisions, setEditRouteDivisions] = useState<string[]>([]);

  // Master Admin Approvers state
  const [adminApprovers, setAdminApprovers] = useState<AdminApprover[]>([]);
  const [newApproverName, setNewApproverName] = useState('');

  // UI state
  const [activeTab, setActiveTab] = useState<'admin_input' | 'admin_view' | 'operator' | 'master_rute' | 'monitor_tv' | 'riwayat'>('admin_input');
  const [operatorDivision, setOperatorDivision] = useState<string>('All Blackpaint');

  // Enforce pristine role-based tab restriction
  useEffect(() => {
    if (
      userRole === 'Operator Workstation Blackpaint' ||
      userRole === 'Operator Workstation Reseller' ||
      userRole === 'Operator Workstation Folder'
    ) {
      if (activeTab !== 'operator') {
        setActiveTab('operator');
      }
      // Set appropriate operator default divisions by workstation
      if (userRole === 'Operator Workstation Blackpaint' && operatorDivision !== 'All Blackpaint') {
        setOperatorDivision('All Blackpaint');
      } else if (userRole === 'Operator Workstation Reseller' && operatorDivision !== 'All Reseller') {
        setOperatorDivision('All Reseller');
      } else if (userRole === 'Operator Workstation Folder' && operatorDivision !== 'All Folder') {
        setOperatorDivision('All Folder');
      }
    } else if (userRole === 'Display Monitoring Admin') {
      if (activeTab !== 'admin_view') {
        setActiveTab('admin_view');
      }
    } else if (userRole === 'Admin') {
      if (activeTab !== 'admin_input' && activeTab !== 'admin_view' && activeTab !== 'monitor_tv') {
        setActiveTab('admin_input');
      }
    }
  }, [userRole, activeTab]);
  
  const dynamicProductList = useMemo(() => {
    return masterRoutes.map(m => m.nama_produk).sort();
  }, [masterRoutes]);

  // Multi-item Order Row system in the parent ID Order
  interface OrderRow {
    nama_produk: string;
    jumlah: number;
    notes: string;
    link_file_desain?: string;
    nama_approve: string;
    acc_operator: string;
    deadline_date: string;
    deadline_time: string;
    is_booster?: boolean;
  }

  const getDefaultDeadlineDate = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1); // default to tomorrow
    return d.toISOString().split('T')[0];
  };

  const [custName, setCustName] = useState('');
  const [sharedIdOrder, setSharedIdOrder] = useState(() => `ORD-${Math.floor(100000 + Math.random() * 900000)}`);
  const [orderRows, setOrderRows] = useState<OrderRow[]>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    const tomorrowStr = d.toISOString().split('T')[0];
    return [
      { nama_produk: '', jumlah: 100, notes: '', nama_approve: '', acc_operator: '', deadline_date: tomorrowStr, deadline_time: '17:00', is_booster: false }
    ];
  });

  // Sync orderRows with current master routes list defensively
  useEffect(() => {
    if (dynamicProductList.length > 0) {
      setOrderRows(prev => {
        const tomorrowStr = getDefaultDeadlineDate();
        const updated = prev.map(row => {
          let updatedRow = { ...row };
          if (!row.nama_produk || !dynamicProductList.includes(row.nama_produk)) {
            updatedRow.nama_produk = dynamicProductList[0];
          }
          if (!row.deadline_date) {
            updatedRow.deadline_date = tomorrowStr;
          }
          if (!row.deadline_time) {
            updatedRow.deadline_time = '17:00';
          }
          if (row.is_booster === undefined) {
            updatedRow.is_booster = false;
          }
          if (row.nama_approve === undefined) {
            updatedRow.nama_approve = '';
          }
          if (row.acc_operator === undefined) {
            updatedRow.acc_operator = '';
          }
          return updatedRow;
        });

        // Avoid state update if no products actually changed to prevent infinite rerender loops
        const hasChanged = updated.some((row, idx) => 
          !prev[idx] || 
          row.nama_produk !== prev[idx].nama_produk || 
          row.jumlah !== prev[idx].jumlah || 
          row.notes !== prev[idx].notes || 
          row.nama_approve !== prev[idx].nama_approve ||
          row.acc_operator !== prev[idx].acc_operator ||
          row.deadline_date !== prev[idx].deadline_date ||
          row.deadline_time !== prev[idx].deadline_time ||
          row.is_booster !== prev[idx].is_booster
        );
        return hasChanged ? updated : prev;
      });
    }
  }, [dynamicProductList]);

  // Monitoring dashboard view search & filter states
  const [monSearchQuery, setMonSearchQuery] = useState('');
  const [monWsFilter, setMonWsFilter] = useState<'Semua' | 'Blackpaint' | 'Reseller' | 'Folder'>('Semua');

  // History and Completed Orders tab states
  const [historySearch, setHistorySearch] = useState('');
  const [historyStartDate, setHistoryStartDate] = useState('');
  const [historyEndDate, setHistoryEndDate] = useState('');
  const [historyBoosterFilter, setHistoryBoosterFilter] = useState<'all' | 'booster' | 'normal'>('all');
  const [selectedHistoryOrder, setSelectedHistoryOrder] = useState<Order | null>(null);

  // Custom Confirmation Modal state
  const [confirmConfig, setConfirmConfig] = useState<{
    title: string;
    message: string;
    onConfirm: () => void | Promise<void>;
    confirmText?: string;
    cancelText?: string;
    type?: 'danger' | 'warning' | 'info';
  } | null>(null);

  // Super Admin Credentials Authorization State
  const [authConfig, setAuthConfig] = useState<{
    onSuccess: () => void | Promise<void>;
    onCancel?: () => void;
    title: string;
    message: string;
  } | null>(null);
  const [authUsername, setAuthUsername] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState('');

  // Active obstacle reporting modal state
  const [obstacleTargetOrderId, setObstacleTargetOrderId] = useState<string | null>(null);

  // Flutter Specification Tabs State
  const [selectedDartFileIdx, setSelectedDartFileIdx] = useState(0);
  const [copiedMap, setCopiedMap] = useState<Record<number, boolean>>({});

  // Trigger alert sound or visual effect when active obstacle count changes
  const activeObstacles = orders.filter(o => o.status_kendala && !o.is_archived);
  const totalActive = orders.filter(o => !o.is_archived).length;
  const finishedOrders = orders.filter(o => o.is_archived).length;
  const urgentOrdersCount = orders.filter(o => {
    if (o.is_archived) return false;
    if (o.is_booster) return true;
    const hrsRemaining = (new Date(o.datetime_deadline).getTime() - now.getTime()) / (3600 * 1000);
    return hrsRemaining < 2;
  }).length;

  // Visual Alert state
  const [scrolledToProblem, setScrolledToProblem] = useState(false);

  // Success notifications list
  const [notifications, setNotifications] = useState<OrderNotification[]>([]);

  // Edit order modal state
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);

  // Pending 2-step verification modal state
  const [pendingVerificationOrder, setPendingVerificationOrder] = useState<Order | null>(null);
  const [pendingVerificationStep, setPendingVerificationStep] = useState<1 | 2>(1);
  const [pendingAuthUsername, setPendingAuthUsername] = useState('');
  const [pendingAuthPassword, setPendingAuthPassword] = useState('');
  const [pendingAuthError, setPendingAuthError] = useState('');

  const handleOpenEditOrder = (o: Order) => {
    setEditingOrder(JSON.parse(JSON.stringify(o))); // deep copy to prevent mutating original state directly
  };

  const handleSaveEditOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOrder) return;

    const orderId = editingOrder.id_order;

    // Direct synchronous state update
    setOrders(prev => {
      const next = prev.map(o => o.id_order === orderId ? editingOrder : o);
      try {
        localStorage.setItem('blackpaint_orders', JSON.stringify(next));
      } catch (err) {}
      return next;
    });

    try {
      await setDoc(doc(db, 'prod_queue_orders', orderId), editingOrder);
      setEditingOrder(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `prod_queue_orders/${orderId}`);
    }
  };

  const handleExecutePendingActivation = async (o: Order) => {
    const orderId = o.id_order;
    const newPendingStatus = true;

    setOrders(prev => {
      const next = prev.map(item => item.id_order === orderId ? { ...item, is_pending: newPendingStatus } : item);
      try {
        localStorage.setItem('blackpaint_orders', JSON.stringify(next));
      } catch (err) {}
      return next;
    });

    try {
      await setDoc(doc(db, 'prod_queue_orders', orderId), {
        ...o,
        is_pending: newPendingStatus
      });
    } catch (err) {
      console.warn("Cloud Firestore write background error:", err);
    }
    setPendingVerificationOrder(null);
  };

  const handleTogglePending = async (orderId: string, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const o = orders.find(ord => ord.id_order === orderId);
    if (!o) return;

    if (!o.is_pending) {
      // Activating pending status -> trigger 2-step verification
      setPendingVerificationOrder(o);
      setPendingVerificationStep(1);
      setPendingAuthUsername('');
      setPendingAuthPassword('');
      setPendingAuthError('');
      return;
    }

    // Direct synchronous deactivation (Resuming pending order is safe & instant)
    const newPendingStatus = false;

    setOrders(prev => {
      const next = prev.map(item => item.id_order === orderId ? { ...item, is_pending: newPendingStatus } : item);
      try {
        localStorage.setItem('blackpaint_orders', JSON.stringify(next));
      } catch (err) {}
      return next;
    });

    try {
      await setDoc(doc(db, 'prod_queue_orders', orderId), {
        ...o,
        is_pending: newPendingStatus
      });
    } catch (err) {
      console.warn("Cloud Firestore write background error:", err);
    }
  };

  // Handle adding a new order with multi-row transaction lines support
  const handleAddOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!custName.trim() || orderRows.length === 0) return;
    if (dynamicProductList.length === 0) {
      alert("Silakan daftarkan nama produk beserta model alur rute terlebih dahulu di tab Master Setting Rute Rantai.");
      return;
    }

    const tanggalInputIso = new Date().toISOString();
    const newOrdersCreated: Order[] = [];

    for (let i = 0; i < orderRows.length; i++) {
      const row = orderRows[i];
      const { route } = getProductRouteDetails(row.nama_produk);
      const divisionsSnapshot = route ? route.divisions : ['Cutting', 'DTF'];

      // If only 1 row, keep clean id; otherwise append index suffixes
      const itemDocId = orderRows.length === 1 ? sharedIdOrder : `${sharedIdOrder}-${i + 1}`;

      const rowDeadlineStr = `${row.deadline_date || getDefaultDeadlineDate()}T${row.deadline_time || '17:00'}:00`;
      const rowDeadlineIso = new Date(rowDeadlineStr).toISOString();

      const newOrderItem: Order = {
        id_order: itemDocId,
        id_parent_order: sharedIdOrder,
        nama_customer: custName,
        nama_produk: row.nama_produk,
        jumlah: Number(row.jumlah),
        tanggal_input: tanggalInputIso,
        datetime_deadline: rowDeadlineIso,
        status_rute_sekarang: 0,
        status_kendala: false,
        is_booster: !!row.is_booster,
        notes: row.notes,
        nama_approve: row.nama_approve,
        acc_operator: row.acc_operator,
        alur_divisi: divisionsSnapshot,
        is_archived: false,
        tanggal_update_rute: tanggalInputIso
      };

      newOrdersCreated.push(newOrderItem);
    }

    // Synchronously update local state and localStorage for instant, zero-latency responsiveness
    setOrders((prev) => {
      const merged = [...newOrdersCreated, ...prev];
      try {
        localStorage.setItem('blackpaint_orders', JSON.stringify(merged));
      } catch (localErr) {
        console.warn("Local storage write block skipped:", localErr);
      }
      return merged;
    });

    // Trigger success notification popup at bottom-right corner
    const hasBooster = newOrdersCreated.some(o => o.is_booster);
    const nowTimeStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    const successNotif: OrderNotification = {
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      orderId: sharedIdOrder,
      custName: custName,
      itemsCount: orderRows.length,
      timestamp: nowTimeStr,
      isBooster: hasBooster
    };
    setNotifications(prev => [successNotif, ...prev]);

    // Auto dismiss after 4.5 seconds
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== successNotif.id));
    }, 4500);

    // Reset Input Form fields cleanly
    const tomorrowStr = getDefaultDeadlineDate();
    setCustName('');
    setSharedIdOrder(`ORD-${Math.floor(100000 + Math.random() * 900000)}`);
    setOrderRows([{ 
      nama_produk: dynamicProductList[0] || '', 
      jumlah: 100, 
      notes: '', 
      nama_approve: '', 
      acc_operator: '', 
      deadline_date: tomorrowStr, 
      deadline_time: '17:00',
      is_booster: false
    }]);

    // Write to Firebase background tasks safely without page reload or unhandled promise bubbles
    try {
      const batch = writeBatch(db);
      newOrdersCreated.forEach((item) => {
        batch.set(doc(db, 'prod_queue_orders', item.id_order), item);
      });
      await batch.commit();
    } catch (err) {
      console.warn("Cloud Firestore background write skipped of network or sandboxed:", err);
    }
  };

  // Selesai & Oper Logic
  const handleCompleteAndOper = async (orderId: string, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const o = orders.find(ord => ord.id_order === orderId);
    if (!o || o.is_pending) return;

    const { route } = getProductRouteDetails(o.nama_produk, o.alur_divisi);
    if (!route) return;

    const nextIndex = o.status_rute_sekarang + 1;
    let updatedFields: Partial<Order> = {};

    if (nextIndex < route.divisions.length) {
      // Increment route step and naturally clear obstacle on successful operation
      updatedFields = {
        status_rute_sekarang: nextIndex,
        status_kendala: false,
        jenis_kendala: '',
        tanggal_update_rute: new Date().toISOString()
      };
    } else {
      // Final step -> complete production completely!
      updatedFields = {
        is_archived: true,
        status_kendala: false,
        jenis_kendala: ''
      };
    }

    // Direct synchronous state update
    setOrders(prev => {
      const next = prev.map(item => item.id_order === orderId ? { ...item, ...updatedFields } : item);
      try {
        localStorage.setItem('blackpaint_orders', JSON.stringify(next));
      } catch (err) {}
      return next;
    });

    try {
      await setDoc(doc(db, 'prod_queue_orders', orderId), { ...o, ...updatedFields });
    } catch (err) {
      console.warn("Cloud Firestore write background error:", err);
    }
  };

  // ADA KENDALA Trigger
  const handleReportObstacle = async (orderId: string, type: 'Mesin Eror' | 'Bahan Rusak' | 'File Corrupt', e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const o = orders.find(ord => ord.id_order === orderId);
    if (!o) return;

    // Direct synchronous state update
    setOrders(prev => {
      const next = prev.map(item => item.id_order === orderId ? { ...item, status_kendala: true, jenis_kendala: type } : item);
      try {
        localStorage.setItem('blackpaint_orders', JSON.stringify(next));
      } catch (err) {}
      return next;
    });
    setObstacleTargetOrderId(null);

    try {
      await setDoc(doc(db, 'prod_queue_orders', orderId), {
        ...o,
        status_kendala: true,
        jenis_kendala: type
      });
    } catch (err) {
      console.warn("Cloud Firestore write background error:", err);
    }
  };

  // Resolve Kendala
  const handleResolveObstacle = async (orderId: string, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const o = orders.find(ord => ord.id_order === orderId);
    if (!o) return;

    // Direct synchronous state update
    setOrders(prev => {
      const next = prev.map(item => item.id_order === orderId ? { ...item, status_kendala: false, jenis_kendala: '' } : item);
      try {
        localStorage.setItem('blackpaint_orders', JSON.stringify(next));
      } catch (err) {}
      return next;
    });

    try {
      await setDoc(doc(db, 'prod_queue_orders', orderId), {
        ...o,
        status_kendala: false,
        jenis_kendala: ''
      });
    } catch (err) {
      console.warn("Cloud Firestore write background error:", err);
    }
  };

  // Delete/Cancel Order completely
  const handleDeleteOrder = (orderId: string, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setConfirmConfig({
      title: 'Hapus Pesanan Antrean',
      message: `Apakah Anda yakin ingin menghapus order ${orderId}? Tindakan ini akan menghapus seluruh rekaman antrean di database real-time dan tidak dapat dibatalkan.`,
      confirmText: 'Hapus Order',
      type: 'danger',
      onConfirm: async () => {
        // Direct state update
        setOrders(prev => {
          const next = prev.filter(item => item.id_order !== orderId);
          try {
            localStorage.setItem('blackpaint_orders', JSON.stringify(next));
          } catch (err) {}
          return next;
        });

        try {
          await deleteDoc(doc(db, 'prod_queue_orders', orderId));
        } catch (err) {
          console.warn("Cloud Firestore delete background error:", err);
        }
      }
    });
  };

  // Master database clear function for completely empty baseline (State Memori & safe LocalStorage focus)
  const handleClearAllDatabase = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    setAuthUsername('');
    setAuthPassword('');
    setAuthError('');
    setAuthConfig({
      title: 'Verifikasi Otorisasi Super Admin',
      message: 'Tindakan ini membutuhkan verifikasi kredensial Super Admin (Operational) sebelum mengosongkan seluruh data antrean database.',
      onSuccess: () => {
        setConfirmConfig({
          title: 'Kosongkan Seluruh Database',
          message: 'Apakah Anda yakin ingin menghapus SELURUH pesanan dalam antrean? Tindakan ini permanen, mereset tampilan dan tidak dapat dibatalkan.',
          confirmText: 'Ya, Kosongkan Antrean',
          type: 'danger',
          onConfirm: async () => {
            // Clear state and localStorage immediately
            setOrders([]);
            try {
              localStorage.removeItem('blackpaint_orders');
            } catch (err) {
              console.warn("Local storage clear error:", err);
            }

            // Background clear tasks safely
            try {
              function chunkArray<T>(arr: T[], size: number): T[][] {
                const chunks: T[][] = [];
                for (let i = 0; i < arr.length; i += size) {
                  chunks.push(arr.slice(i, i + size));
                }
                return chunks;
              }

              const ordersToDelete = [...orders];
              if (ordersToDelete.length > 0) {
                const chunks = chunkArray<Order>(ordersToDelete, 100);
                for (const chunk of chunks) {
                  const batch = writeBatch(db);
                  chunk.forEach((o) => {
                    if (o.id_order) {
                      batch.delete(doc(db, 'prod_queue_orders', o.id_order));
                    }
                  });
                  await batch.commit();
                }
              }
            } catch (err) {
              console.warn("Silent background cloud deletions skipped:", err);
            }

            alert("Database antrean berhasil dikosongkan.");
          }
        });
      }
    });
  };

  // Copy code helper
  const handleCopyCode = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedMap(prev => ({ ...prev, [idx]: true }));
    setTimeout(() => {
      setCopiedMap(prev => ({ ...prev, [idx]: false }));
    }, 2000);
  };

  // Format countdown string
  const getTimerDetails = (order: Order) => {
    const deadlineMs = new Date(order.datetime_deadline).getTime();
    const diffMs = deadlineMs - now.getTime();
    
    if (diffMs <= 0) {
      return {
        text: 'DEADLINE LEWAT!',
        colorClass: 'text-red-400 bg-red-950/50 font-bold border-red-800/60 font-mono text-[10px] px-2 py-0.5 rounded border shadow-[0_0_15px_rgba(239,68,68,0.25)]',
        cardBgClass: 'bento-card-red border-red-600/80 shadow-[0_0_20px_rgba(239,68,68,0.25)]',
        urgency: 'urgent'
      };
    }

    const hours = Math.floor(diffMs / (3600 * 1000));
    const minutes = Math.floor((diffMs % (3600 * 1000)) / (60 * 1000));
    const seconds = Math.floor((diffMs % (60 * 1000)) / 1000);

    const formattedTime = `${hours}j ${minutes}m ${seconds}s`;

    let colorClass = 'text-green-400 bg-green-950/40 border-emerald-800/50 font-mono text-[10px] px-2 py-0.5 rounded border';
    let cardBgClass = 'bento-card bento-card-hover border-zinc-800/80';
    let urgency = 'safe';

    if (order.is_booster) {
      // Booster takes highest coloring priority
      colorClass = 'text-red-400 bg-red-950/60 font-bold border-red-800/60 font-mono text-[10px] px-2 py-0.5 rounded border shadow-[0_0_15px_rgba(239,68,68,0.2)] animate-pulse';
      cardBgClass = 'bento-card-red border-red-600/60 shadow-[0_0_25px_rgba(239,68,68,0.2)]';
      urgency = 'urgent';
    } else if (hours < 2) {
      colorClass = 'text-red-400 bg-red-950/50 font-bold border-red-900/60 font-mono text-[10px] px-2 py-0.5 rounded border';
      cardBgClass = 'bento-card-red border-red-900/40 shadow-[0_0_20px_rgba(239,68,68,0.15)]';
      urgency = 'urgent';
    } else if (hours < 5) {
      colorClass = 'text-amber-400 bg-amber-950/55 font-semibold border-amber-900/50 font-mono text-[10px] px-2 py-0.5 rounded border';
      cardBgClass = 'bento-card-amber border-amber-800/30';
      urgency = 'warning';
    } else {
      colorClass = 'text-emerald-400 bg-emerald-950/40 border-emerald-900/40 font-mono text-[10px] px-2 py-0.5 rounded border';
      cardBgClass = 'bento-card-green border-zinc-800/50';
      urgency = 'safe';
    }

    // Special overwrite if obstacle is present
    if (order.status_kendala) {
      cardBgClass = 'animate-pulse-red border-red-500 bg-red-950/20';
    }

    return { text: formattedTime, colorClass, cardBgClass, urgency };
  };

  // Helper to format deadline date & time nicely with same type of settings and custom layout
  const formatDeadlineDateAndTime = (isoString: string) => {
    if (!isoString) return '';
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `Deadline: ${day}/${month}/${year} ${hours}.${minutes}`;
  };

  // Helper to calculate elapsed time per active route starting since order creation (tanggal_input) or last handoff (tanggal_update_rute)
  const getElapsedTimerText = (inputIsoString: string, updateIsoString?: string) => {
    const referenceIso = updateIsoString || inputIsoString;
    if (!referenceIso) return '';
    const inputMs = new Date(referenceIso).getTime();
    const diffMs = now.getTime() - inputMs;
    if (diffMs < 0) return '0m';
    const totalMinutes = Math.floor(diffMs / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    if (hours > 0) {
      return `${hours}j ${mins}m`;
    }
    return `${mins}m`;
  };

  // Helper to fetch route detail details for orders
  const getProductRouteDetails = (productName: string, orderAlurDivisi?: string[]) => {
    if (orderAlurDivisi && orderAlurDivisi.length > 0) {
      return {
        routeId: 'embedded',
        route: {
          id: 'embedded',
          name: productName,
          divisions: orderAlurDivisi,
        },
      };
    }
    const matched = masterRoutes.find(
      r => r.nama_produk.toLowerCase() === productName.toLowerCase()
    );
    if (matched) {
      return {
        routeId: matched.id_produk,
        route: {
          id: matched.id_produk,
          name: matched.nama_produk,
          divisions: matched.alur_divisi,
        },
      };
    }
    // Safe dynamic fallback if not registered yet
    return {
      routeId: 'fallback_route',
      route: {
        id: 'fallback_route',
        name: productName || 'Draft Rute',
        divisions: ['Cutting']
      }
    };
  };

  // Filter & sort algorithm for operator workstation supporting 3 roles or Admin specifically
  const getFilteredAndSortedOperatorOrders = (divName: string) => {
    return orders
      .filter(o => {
        if (o.is_archived) return false;
        const currentDivision = o.alur_divisi?.[o.status_rute_sekarang];
        if (!currentDivision) return false;

        const divNameLower = divName.toLowerCase();
        const currentStepLower = currentDivision.toLowerCase();
        const ws = getWorkstationByDivision(currentDivision);

        // 1. Role Operator Workstation Blackpaint
        if (userRole === 'Operator Workstation Blackpaint') {
          if (divName === 'All Blackpaint') {
            return ws === 'Workstation Blackpaint';
          }
          return currentStepLower === divNameLower;
        }

        // 2. Role Operator Workstation Reseller
        if (userRole === 'Operator Workstation Reseller') {
          if (divName === 'All Reseller') {
            return ws === 'Workstation Reseller';
          }
          return currentStepLower === divNameLower;
        }

        // 3. Role Operator Workstation Folder
        if (userRole === 'Operator Workstation Folder') {
          if (divName === 'All Folder') {
            return ws === 'Workstation Folder';
          }
          return currentStepLower === divNameLower;
        }

        // Admin & Operational can see specifically selected divName
        if (divName === 'All Blackpaint') return ws === 'Workstation Blackpaint';
        if (divName === 'All Reseller') return ws === 'Workstation Reseller';
        if (divName === 'All Folder') return ws === 'Workstation Folder';
        return currentStepLower === divNameLower;
      })
      .sort((a, b) => {
        // Prioritas Mutlak: Booster goes strictly first
        if (a.is_booster && !b.is_booster) return -1;
        if (!a.is_booster && b.is_booster) return 1;

        // Next sort criteria: remaining time to deadline ascending (closest deadline first)
        const deadlineA = new Date(a.datetime_deadline).getTime();
        const deadlineB = new Date(b.datetime_deadline).getTime();
        return deadlineA - deadlineB;
      });
  };

  // Auto route rendering on first product select in Form
  const { route: activeFormRoute } = getProductRouteDetails(orderRows[0]?.nama_produk || '');

  // Admin Approver operations
  const handleAddAdminApprover = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newApproverName.trim()) return;
    const cleanName = newApproverName.trim();
    const cleanId = cleanName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
    if (!cleanId) return;

    try {
      await setDoc(doc(db, 'master_admin_approvers', cleanId), {
        id: cleanId,
        nama: cleanName
      });
      setNewApproverName('');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `master_admin_approvers/${cleanId}`);
    }
  };

  const handleDeleteAdminApprover = async (id: string, name: string) => {
    setConfirmConfig({
      message: `Apakah Anda yakin ingin menghapus Admin Approve "${name}"? Tindakan ini akan menghapusnya dari daftar pilihan.`,
      confirmText: 'Hapus',
      type: 'danger',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'master_admin_approvers', id));
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, `master_admin_approvers/${id}`);
        }
      }
    });
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-[#fafafa] flex flex-col font-sans transition-colors duration-300">
      
      {/* HEADER SECTION */}
      <header className="bg-zinc-950/80 backdrop-blur-md border-b border-zinc-900 shrink-0 sticky top-0 z-50 shadow-2xl px-4 md:px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* Logo & Main Title */}
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-zinc-900 border border-zinc-800/80 rounded-xl shadow-lg">
              <Workflow className="h-6 w-6 text-zinc-100 animate-spin-slow" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl md:text-2xl font-display font-semibold tracking-tight text-zinc-100">
                  Blackpaint Queue
                </h1>
                <span className="text-[10px] uppercase font-mono tracking-widest px-2.5 py-0.5 rounded-md bg-zinc-800 text-zinc-300 font-bold border border-zinc-700/30">
                  v4.0 Real-Time
                </span>
              </div>
              <p className="text-xs text-zinc-400 font-sans mt-0.5">
                Sistem Manajemen Antrean Produksi Berantai Multiplatform
              </p>
            </div>
          </div>

          {/* Quick Metrics Indicators - Bento Style */}
          <div className="flex flex-wrap items-center gap-2 md:gap-3 bg-zinc-900/60 p-1.5 rounded-xl border border-zinc-800/80">
            
            <div className="px-3 py-1 bg-zinc-950 border border-zinc-900 rounded-lg text-center min-w-[70px]">
              <span className="block text-[10px] text-zinc-400 font-medium uppercase tracking-wider">Antrean</span>
              <span className="text-sm font-mono font-bold text-zinc-100">{totalActive}</span>
            </div>

            <div className="px-3 py-1 bg-zinc-950 border border-zinc-900 rounded-lg text-center min-w-[70px]">
              <span className="block text-[10px] text-zinc-400 font-medium uppercase tracking-wider">Mendesak</span>
              <span className="text-sm font-mono font-bold text-red-400 flex items-center justify-center gap-1">
                {urgentOrdersCount > 0 && <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-ping" />}
                {urgentOrdersCount}
              </span>
            </div>

            <div className={`px-3 py-1 bg-zinc-950 border border-zinc-900 rounded-lg text-center min-w-[70px] ${activeObstacles.length > 0 ? 'border border-red-900/60 bg-red-950/20' : ''}`}>
              <span className="block text-[10px] text-zinc-400 font-medium uppercase tracking-wider">Kendala</span>
              <span className={`text-sm font-mono font-bold ${activeObstacles.length > 0 ? 'text-red-400 animate-pulse' : 'text-zinc-500'}`}>
                {activeObstacles.length}
              </span>
            </div>

            <div className="px-3 py-1 bg-zinc-950 border border-zinc-900 rounded-lg text-center min-w-[70px]">
              <span className="block text-[10px] text-zinc-400 font-medium uppercase tracking-wider">Arsip Selesai</span>
              <span className="text-sm font-mono font-bold text-emerald-400">{finishedOrders}</span>
            </div>



            <div className="border-l border-zinc-800 h-6 shrink-0 hidden md:block" />

            <div className="flex items-center gap-2 px-3 py-1 bg-zinc-950 border border-zinc-900 rounded-xl shrink-0">
              <div className="flex flex-col text-left hidden sm:flex">
                <span className="text-[9px] text-zinc-500 font-mono leading-none">Pengguna:</span>
                <span className="text-[10px] font-semibold text-zinc-300 font-mono leading-none mt-0.5" title={userEmail}>
                  {userRole === 'Operational' ? 'operational...' : userRole === 'Admin' ? 'admin...' : 'operator...'}
                </span>
              </div>
              <select
                value={userRole}
                onChange={(e) => {
                  const r = e.target.value as any;
                  if (r === 'Operational') {
                    setAuthUsername('');
                    setAuthPassword('');
                    setAuthError('');
                    setAuthConfig({
                      title: 'Otorisasi Super Admin',
                      message: 'Silakan masukkan kredensial akun Super Admin (Operational) untuk berpindah hak akses.',
                      onSuccess: () => {
                        setUserRole('Operational');
                      }
                    });
                  } else {
                    setUserRole(r);
                  }
                }}
                className="bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-emerald-400 font-bold px-2.5 py-1 outline-none cursor-pointer focus:border-zinc-700 font-mono"
              >
                <option value="Operational">Role: Operational (Super Admin)</option>
                <option value="Admin">Role: Admin (Input & View)</option>
                <option value="Operator Workstation Blackpaint">Role: Operator Workstation Blackpaint</option>
                <option value="Operator Workstation Reseller">Role: Operator Workstation Reseller</option>
                <option value="Operator Workstation Folder">Role: Operator Workstation Folder</option>
                <option value="Display Monitoring Admin">Role: Display Monitoring Admin (Read-Only)</option>
              </select>
            </div>

            {userRole === 'Operational' && (orders.length > 0 || masterRoutes.length > 0) && (
              <button
                type="button"
                onClick={handleClearAllDatabase}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-955/25 hover:bg-red-900 border border-red-900/40 text-red-400 hover:text-white rounded-xl text-xs font-semibold font-sans transition cursor-pointer shrink-0"
                title="Reset dan Kosongkan Database"
              >
                <Trash2 className="h-3.5 w-3.5 shrink-0" />
                <span>Kosongkan Database</span>
              </button>
            )}
          </div>
        </div>

        {/* Global Warning Indicator for Admins */}
        {(userRole === 'Operational' || userRole === 'Admin') && activeObstacles.length > 0 && (
          <div className="bg-red-950/40 border border-red-905/30 text-red-200 px-4 py-2.5 mt-3 rounded-xl flex items-center justify-between gap-2 overflow-hidden animate-pulse-red shadow-lg">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-400 shrink-0" />
              <div className="text-xs md:text-sm font-medium">
                <span className="font-bold">PERINGATAN KENDALA OPERATOR:</span> ({activeObstacles.length} Orderan Butuh Perhatian) - Silakan periksa atau selesaikan kendala di bawah.
              </div>
            </div>
            <button
              onClick={() => {
                setActiveTab('admin_view');
                const element = document.getElementById('monitoring-list');
                if (element) element.scrollIntoView({ behavior: 'smooth' });
              }}
              className="text-xs bg-red-600 hover:bg-red-550 text-white font-bold py-1 px-3 rounded-lg transition-all shrink-0 cursor-pointer shadow-md"
            >
              Lihat Detail
            </button>
          </div>
        )}
      </header>

      {/* DASHBOARD NAVIGATION PANEL */}
      {(userRole === 'Operational' || userRole === 'Admin') && (
        <div className="bg-[#09090b]/80 backdrop-blur-md border-b border-zinc-900/50 shrink-0 sticky top-[82px] z-40 shadow-md px-4 md:px-6 animate-fade-in">
          <div className="max-w-7xl mx-auto flex overflow-x-auto gap-2 py-3 text-sm scrollbar-none">

            <button
              onClick={() => setActiveTab('admin_input')}
              className={`flex items-center gap-2 py-2 px-4 rounded-xl font-medium transition-all shrink-0 cursor-pointer border ${
                activeTab === 'admin_input'
                  ? 'bg-zinc-805 bg-zinc-800 text-white border-zinc-700/80 shadow-inner'
                  : 'text-zinc-400 border-transparent hover:text-zinc-200 hover:bg-zinc-900/60'
              }`}
            >
              <PlusCircle className="h-4 w-4 text-emerald-450 text-emerald-400" />
              <span>📥 Dashboard Input Admin</span>
            </button>

            <button
              onClick={() => setActiveTab('admin_view')}
              className={`flex items-center gap-2 py-2 px-4 rounded-xl font-medium transition-all shrink-0 cursor-pointer border ${
                activeTab === 'admin_view'
                  ? 'bg-zinc-805 bg-zinc-800 text-white border-zinc-700/80 shadow-inner'
                  : 'text-zinc-400 border-transparent hover:text-zinc-200 hover:bg-zinc-900/60'
              }`}
            >
              <Tv className="h-4 w-4 text-blue-400" />
              <span>📊 Dashboard View Admin</span>
            </button>

            {userRole === 'Operational' && (
              <button
                onClick={() => setActiveTab('operator')}
                className={`flex items-center gap-2 py-2 px-4 rounded-xl font-medium transition-all shrink-0 cursor-pointer border ${
                  activeTab === 'operator'
                    ? 'bg-zinc-800 text-emerald-400 border-zinc-700/80 shadow-inner'
                    : 'text-zinc-400 border-transparent hover:text-emerald-200 hover:bg-zinc-900/60'
                }`}
              >
                <Computer className="h-4 w-4 text-emerald-400" />
                <span>🖥️ Sisi Operator</span>
              </button>
            )}

            {userRole === 'Operational' && (
              <button
                onClick={() => setActiveTab('master_rute')}
                className={`flex items-center gap-2 py-2 px-4 rounded-xl font-medium transition-all shrink-0 cursor-pointer border ${
                  activeTab === 'master_rute'
                    ? 'bg-zinc-800 text-teal-400 border-teal-850 shadow-inner'
                    : 'text-zinc-400 border-transparent hover:text-teal-400 hover:bg-zinc-900/60'
                }`}
              >
                <Sliders className="h-4 w-4 text-teal-400" />
                <span>🛠️ Master Setting Rute</span>
              </button>
            )}

            <button
              onClick={() => setActiveTab('monitor_tv')}
              className={`flex items-center gap-2 py-2 px-4 rounded-xl font-medium transition-all shrink-0 cursor-pointer border ${
                activeTab === 'monitor_tv'
                  ? 'bg-zinc-800 text-amber-400 border-amber-800/40 shadow-inner'
                  : 'text-zinc-400 border-transparent hover:text-amber-400 hover:bg-zinc-900/60'
              }`}
            >
              <Tv className="h-4 w-4 text-amber-400" />
              <span>🖥️ Monitor TV Display</span>
            </button>

            {userRole === 'Operational' && (
              <button
                onClick={() => setActiveTab('riwayat')}
                className={`flex items-center gap-2 py-2 px-4 rounded-xl font-medium transition-all shrink-0 cursor-pointer border ${
                  activeTab === 'riwayat'
                    ? 'bg-zinc-800 text-emerald-400 border-emerald-800/40 shadow-inner'
                    : 'text-zinc-400 border-transparent hover:text-emerald-400 hover:bg-zinc-900/60'
                }`}
              >
                <Archive className="h-4 w-4 text-emerald-400" />
                <span>📂 Arsip Riwayat Selesai</span>
              </button>
            )}

          </div>
        </div>
      )}

      {/* MAIN LAYOUT CANVAS */}
      <main className="flex-grow p-4 md:p-6 max-w-7xl w-full mx-auto self-stretch">

        {/* TAB 2A: DASHBOARD INPUT ADMIN (Writable Form) */}
        {activeTab === 'admin_input' && (
          <div className="max-w-4xl mx-auto bento-card p-6 md:p-8 shadow-2xl animate-fade-in font-sans">
            <div className="flex items-center gap-3 mb-6 border-b border-zinc-850 pb-4">
              <div className="p-2 bg-emerald-950 border border-emerald-900 rounded-xl">
                <PlusCircle className="h-6 w-6 text-emerald-400 animate-pulse" />
              </div>
              <div>
                <h2 className="text-xl font-display font-medium text-white">DASHBOARD INPUT ADMIN</h2>
                <p className="text-xs text-zinc-400 mt-1">Formulir penjaluran rute antrean produksi baru bagi Admin.</p>
              </div>
            </div>

            {dynamicProductList.length === 0 && (
              <div className="bg-amber-950/40 border border-amber-900/50 text-amber-300 rounded-2xl p-5 text-sm mb-6 space-y-2.5 animate-fade-in">
                <div className="flex items-center gap-2 font-bold uppercase text-xs">
                  <AlertTriangle className="h-4 w-4 text-amber-400" />
                  <span>Database Master Produk & Rute Kosong</span>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Anda belum mendaftarkan jenis produk atau rantai rute apapun di tab <strong className="text-zinc-200">"Master Setting Rute Rantai"</strong>. Silakan beralih ke tab tersebut dengan peran <strong className="text-emerald-450">Operational (Super Admin)</strong> untuk mendaftarkan rute produk terlebih dahulu sebelum dapat menginput pesanan baru.
                </p>
              </div>
            )}

            <form onSubmit={handleAddOrder} className="flex flex-col gap-6 font-sans">
              
              {/* Part 1: ID Order & Customer */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 bg-zinc-900/40 p-5 rounded-2xl border border-zinc-850/60 font-sans">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 pl-1 font-sans">
                    ID Order (Unik / Edit Manual)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: ORD-99173"
                    value={sharedIdOrder}
                    onChange={(e) => setSharedIdOrder(e.target.value)}
                    className="w-full bg-[#09090b] border border-zinc-800 text-white rounded-xl px-3.5 py-3 text-sm outline-none focus:border-zinc-700 font-mono tracking-wider transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 pl-1 font-sans">
                    Nama Customer / Proyek *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Masukkan nama customer"
                    value={custName}
                    onChange={(e) => setCustName(e.target.value)}
                    className="w-full bg-[#09090b] border border-zinc-800 text-white rounded-xl px-3.5 py-3 text-sm outline-none focus:border-zinc-700 transition font-sans"
                  />
                </div>
              </div>

              {/* Part 2: Dynamic Items (Tambah Jenis Orderan) */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400 font-mono pl-1">
                    Rincian Jenis Cetakan (Daftar Multi-Produk):
                  </h3>
                  <button
                    type="button"
                    disabled={dynamicProductList.length === 0}
                    onClick={() => setOrderRows(prev => [...prev, { 
                      nama_produk: dynamicProductList[0] || '', 
                      jumlah: 100, 
                      notes: '', 
                      nama_approve: '',
                      acc_operator: '',
                      deadline_date: getDefaultDeadlineDate(),
                      deadline_time: '17:00',
                      is_booster: false
                    }])}
                    className={`flex items-center gap-1.5 text-xs font-bold py-1.5 px-3 rounded-xl transition cursor-pointer select-none ${
                      dynamicProductList.length === 0
                        ? 'opacity-40 bg-zinc-900 border border-zinc-800 text-zinc-500 cursor-not-allowed'
                        : 'text-emerald-400 hover:text-emerald-300 border border-emerald-950 hover:border-emerald-800 bg-emerald-950/20'
                    }`}
                  >
                    <PlusCircle className="h-4 w-4" />
                    <span>Tambah Jenis Orderan</span>
                  </button>
                </div>

                {orderRows.map((row, idx) => {
                  const { route } = getProductRouteDetails(row.nama_produk);
                  
                  return (
                    <div 
                      key={idx} 
                      className="bg-[#121214] border border-zinc-850 p-5 rounded-2xl shadow-xl flex flex-col gap-4 relative animate-fade-in font-sans"
                    >
                      <div className="flex items-center justify-between border-b border-zinc-900 pb-2.5">
                        <span className="font-mono text-xs font-bold text-emerald-400">
                          Pilihan Cetakan #{idx + 1}
                        </span>
                        {orderRows.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setOrderRows(prev => prev.filter((_, i) => i !== idx))}
                            className="text-xs text-red-400 hover:text-red-350 flex items-center gap-1 transition cursor-pointer"
                            title="Hapus baris cetakan"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span>Hapus</span>
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="sm:col-span-2">
                          <label className="block text-[11px] font-semibold text-zinc-400 uppercase mb-1">
                            Nama Produk *
                          </label>
                          <select
                            value={row.nama_produk}
                            onChange={(e) => {
                              const newProd = e.target.value;
                              setOrderRows(prev => prev.map((r, i) => i === idx ? { ...r, nama_produk: newProd } : r));
                            }}
                            className="w-full bg-[#09090b] border border-zinc-800 text-white text-xs rounded-xl px-3 py-3 cursor-pointer focus:border-zinc-700 outline-none font-sans"
                          >
                            {dynamicProductList.map(prod => (
                              <option key={prod} value={prod}>{prod}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-zinc-400 uppercase mb-1 font-sans">
                            Jumlah (Pcs) *
                          </label>
                          <input
                            type="number"
                            min="1"
                            required
                            value={row.jumlah}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              setOrderRows(prev => prev.map((r, i) => i === idx ? { ...r, jumlah: val } : r));
                            }}
                            className="w-full bg-[#09090b] border border-zinc-800 text-white rounded-xl px-3 py-3 text-xs outline-none focus:border-emerald-500 transition font-sans"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[11px] font-semibold text-zinc-400 uppercase mb-1">
                            Pilihan Admin Approve *
                          </label>
                          <select
                            required
                            value={row.nama_approve}
                            onChange={(e) => {
                              const val = e.target.value;
                              setOrderRows(prev => prev.map((r, i) => i === idx ? { ...r, nama_approve: val } : r));
                            }}
                            className="w-full bg-[#09090b] border border-zinc-800 text-white text-xs rounded-xl px-3 py-2.5 cursor-pointer focus:border-zinc-700 outline-none font-sans"
                          >
                            <option value="">-- Pilih Admin Approve --</option>
                            {adminApprovers.map(appr => (
                              <option key={appr.id} value={appr.nama}>{appr.nama}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-zinc-400 uppercase mb-1 text-sans">
                            ACC Operator (Ketik Manual)
                          </label>
                          <input
                            type="text"
                            placeholder="Contoh: Acc Mas Dani"
                            value={row.acc_operator}
                            onChange={(e) => {
                              const val = e.target.value;
                              setOrderRows(prev => prev.map((r, i) => i === idx ? { ...r, acc_operator: val } : r));
                            }}
                            className="w-full bg-[#09090b] border border-zinc-800 text-zinc-300 rounded-xl px-3 py-2.5 text-xs outline-none focus:border-zinc-700 transition font-sans"
                          />
                        </div>
                      </div>

                      {/* INDIVIDUAL DEADLINE SELECTORS */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-zinc-950/40 p-4 rounded-xl border border-zinc-900/60 font-sans">
                        <div>
                          <label className="block text-[11px] font-semibold text-zinc-450 uppercase mb-1 pl-1">
                            Selesai Tanggal *
                          </label>
                          <input
                            type="date"
                            required
                            value={row.deadline_date}
                            onChange={(e) => {
                              const val = e.target.value;
                              setOrderRows(prev => prev.map((r, i) => i === idx ? { ...r, deadline_date: val } : r));
                            }}
                            className="w-full bg-[#09090b] border border-zinc-800 text-white rounded-xl px-3 py-2.5 text-xs outline-none focus:border-zinc-700 transition"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-zinc-450 uppercase mb-1 pl-1">
                            Jam Batas Waktu *
                          </label>
                          <input
                            type="time"
                            required
                            value={row.deadline_time}
                            onChange={(e) => {
                              const val = e.target.value;
                              setOrderRows(prev => prev.map((r, i) => i === idx ? { ...r, deadline_time: val } : r));
                            }}
                            className="w-full bg-[#09090b] border border-zinc-800 text-white rounded-xl px-3 py-2.5 text-xs outline-none focus:border-zinc-700 transition"
                          />
                        </div>
                      </div>

                      {/* Catatan Pengerjaan Cetakan (Moved under Deadline) */}
                      <div>
                        <label className="block text-[11px] font-semibold text-zinc-400 uppercase mb-1 font-sans">
                          Catatan Pengerjaan Cetakan
                        </label>
                        <input
                          type="text"
                          placeholder="Contoh: Ukuran M 25, L 75 / Finishing doff saja"
                          value={row.notes}
                          onChange={(e) => {
                            const val = e.target.value;
                            setOrderRows(prev => prev.map((r, i) => i === idx ? { ...r, notes: val } : r));
                          }}
                          className="w-full bg-[#09090b] border border-zinc-800 text-zinc-300 rounded-xl px-3 py-2.5 text-xs outline-none focus:border-zinc-700 transition font-sans"
                        />
                      </div>

                      {/* Individual Booster Super Urgent Toggle */}
                      <div className="border border-zinc-900/80 p-3.5 rounded-xl bg-zinc-950/40 font-sans">
                        <label className="flex items-start gap-2.5 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={!!row.is_booster}
                            onChange={(e) => {
                              const val = e.target.checked;
                              setOrderRows(prev => prev.map((r, i) => i === idx ? { ...r, is_booster: val } : r));
                            }}
                            className="mt-1 accent-emerald-400 cursor-pointer h-4 w-4 shrink-0 rounded"
                          />
                          <div>
                            <span className="text-[11px] font-bold text-zinc-300 flex items-center gap-1.5 uppercase font-mono">
                              🚀 Checkbox Booster (Super Urgent)
                            </span>
                            <p className="text-[10px] text-zinc-450 mt-0.5 leading-relaxed">
                              Tandai item cetakan ini sebagai prioritas darurat (Booster) agar berada di barisan paling atas pada display monitor divisi produksi.
                            </p>
                          </div>
                        </label>
                      </div>

                      {/* Realtime automatic route generation preview per item */}
                      <div className="bg-[#09090b]/70 border border-zinc-900 px-4 py-3 rounded-xl font-sans">
                        <span className="text-[10px] font-mono tracking-wider text-teal-400 font-bold uppercase block">
                          Rute Estafet Otomatis Terdeteksi:
                        </span>
                        <div className="flex flex-wrap items-center gap-1.5 mt-2">
                           {route?.divisions.map((div, i) => (
                            <React.Fragment key={i}>
                              <span className="text-[10.5px] font-bold py-1 px-2.5 bg-[#18181b] border border-zinc-800 text-zinc-300 rounded-lg">
                                {div}
                              </span>
                              {i < route.divisions.length - 1 && (
                                <ArrowRight className="h-3 w-3 text-zinc-550" />
                              )}
                            </React.Fragment>
                          ))}
                        </div>
                      </div>

                    </div>
                  );
                })}
              </div>

              {/* Action trigger button */}
              <button
                type="submit"
                className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold py-4 px-5 rounded-2xl transform active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xl text-sm font-sans"
              >
                <PlusCircle className="h-5 w-5" />
                <span>Kirim Order ke Antrean</span>
              </button>
            </form>
          </div>
        )}

        {/* TAB 2B: DASHBOARD VIEW ADMIN (Mutlak Read-Only / Monitoring Mode) */}
        {activeTab === 'admin_view' && (
          <div id="monitoring-list" className="bento-card p-6 md:p-8 shadow-2xl animate-fade-in font-sans">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-850 pb-4 mb-6">
              <div className="flex items-center gap-3 font-sans">
                <div className="p-2 bg-blue-950/70 border border-blue-900 rounded-xl">
                  <Layers className="h-6 w-6 text-blue-400" />
                </div>
                <div>
                  <h2 className="text-xl font-display font-medium text-white uppercase tracking-wide">DASHBOARD VIEW ADMIN (READ-ONLY)</h2>
                  <p className="text-xs text-zinc-400 mt-1">Status antrean real-time berurut berdasarkan prioritas deadline pengerjaan.</p>
                </div>
              </div>

              {/* Total calculations */}
              <div className="flex flex-wrap items-center gap-2 font-sans">
                <span className="text-[10px] uppercase font-mono font-bold bg-[#18181b] border border-zinc-805 text-zinc-350 px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow">
                  Aktif: <span className="text-sky-400 font-extrabold">{orders.filter(o => !o.is_archived).length}</span>
                </span>
                <span className="text-[10px] uppercase font-mono font-bold bg-[#18181b] border border-zinc-805 text-zinc-350 px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow">
                  Darurat: <span className="text-red-400 font-extrabold">{orders.filter(o => o.status_kendala && !o.is_archived).length}</span>
                </span>
                <span className="text-[10px] uppercase font-mono font-bold bg-[#18181b] border border-zinc-805 text-zinc-350 px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow">
                  Booster: <span className="text-amber-400 font-extrabold">{orders.filter(o => o.is_booster && !o.is_archived).length}</span>
                </span>
              </div>
            </div>

            {/* QUICK SEARCH & FILTERS CONTAINER PANEL */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 mb-6 bg-zinc-900/30 p-4 rounded-2xl border border-zinc-850/60 font-sans">
              <div className="sm:col-span-8 relative">
                <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Cari Customer Name, ID Order, Produk..."
                  value={monSearchQuery}
                  onChange={(e) => setMonSearchQuery(e.target.value)}
                  className="w-full bg-[#0c0c0e] border border-zinc-800 pl-10 pr-4 py-2.5 text-xs rounded-xl text-white outline-none focus:border-zinc-700 transition font-sans"
                />
              </div>

              <div className="sm:col-span-4 flex items-center gap-2 font-sans">
                <span className="text-[11px] font-mono font-semibold text-zinc-400 shrink-0 whitespace-nowrap">Filter Workstation:</span>
                <select
                  value={monWsFilter}
                  onChange={(e) => setMonWsFilter(e.target.value as any)}
                  className="w-full bg-[#0c0c0e] border border-zinc-800 text-zinc-300 text-xs rounded-xl px-3 py-2.5 outline-none cursor-pointer focus:border-zinc-700 transition font-sans"
                >
                  <option value="Semua">Semua Workstation</option>
                  <option value="Blackpaint">Workstation Blackpaint</option>
                  <option value="Reseller">Workstation Reseller</option>
                  <option value="Folder">Workstation Folder</option>
                </select>
              </div>
            </div>

            {/* List queue showing */}
            <div className="space-y-4">
              {(() => {
                const activeOrders = orders.filter(o => !o.is_archived);
                
                // Filtering
                const filtered = activeOrders.filter(o => {
                  const queryMatches = o.nama_customer.toLowerCase().includes(monSearchQuery.toLowerCase()) ||
                    o.id_order.toLowerCase().includes(monSearchQuery.toLowerCase()) ||
                    o.nama_produk.toLowerCase().includes(monSearchQuery.toLowerCase());

                  if (!queryMatches) return false;

                  if (monWsFilter !== 'Semua') {
                    const activeDiv = o.alur_divisi?.[o.status_rute_sekarang];
                    if (!activeDiv) return false;
                    const ws = getWorkstationByDivision(activeDiv);
                    if (monWsFilter === 'Blackpaint' && ws !== 'Workstation Blackpaint') return false;
                    if (monWsFilter === 'Reseller' && ws !== 'Workstation Reseller') return false;
                    if (monWsFilter === 'Folder' && ws !== 'Workstation Folder') return false;
                  }

                  return true;
                });

                // Sorting: Priority based on countdown, is_booster gets absolute first position
                const sorted = [...filtered].sort((a, b) => {
                  if (a.is_booster && !b.is_booster) return -1;
                  if (!a.is_booster && b.is_booster) return 1;
                  
                  const remA = new Date(a.datetime_deadline).getTime() - now.getTime();
                  const remB = new Date(b.datetime_deadline).getTime() - now.getTime();
                  return remA - remB;
                });

                if (sorted.length === 0) {
                  return (
                    <div className="py-24 text-center border border-dashed border-zinc-850 rounded-2xl font-sans">
                      <CheckCircle2 className="h-12 w-12 text-zinc-700 mx-auto mb-3 animate-pulse" />
                      <p className="text-sm font-semibold text-zinc-300">Tidak ada antrean pesanan.</p>
                      <p className="text-xs text-zinc-400 mt-0.5">Semua antrean yang cocok dengan filter telah selesai pengerjaan.</p>
                    </div>
                  );
                }

                return (
                  <AnimatePresence mode="popLayout" initial={false}>
                    {sorted.map(o => {
                      const { text: timerText, colorClass, cardBgClass, urgency } = getTimerDetails(o);
                      const activeDiv = o.alur_divisi?.[o.status_rute_sekarang] || 'Tidak Terduga';
                      const activeWs = getWorkstationByDivision(activeDiv);

                      return (
                        <motion.div
                          layout
                          key={o.id_order}
                          initial={{ opacity: 0, y: 15 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95, y: -15 }}
                          transition={{ type: "spring", stiffness: 350, damping: 30 }}
                          className={`rounded-2xl border p-5 shadow-lg flex flex-col md:flex-row items-stretch md:items-center justify-between gap-5 relative transition-all duration-300 hover:border-zinc-700 ${cardBgClass}`}
                          style={{ fontFamily: '"Calibri", Arial, sans-serif' }}
                        >
                          {/* Left: ID, Customer info */}
                          <div className="flex-1 space-y-1.5 md:max-w-xs shrink-0 self-start md:self-auto font-sans">
                            <div className="flex items-center flex-wrap gap-2 font-sans">
                              {o.nama_approve && (
                                <span className="text-[10px] font-sans font-bold bg-[#1e1b4b]/80 border border-[#312e81]/60 text-[#a5b4fc] px-2 py-0.5 rounded-md shadow flex items-center gap-1 shrink-0 select-none">
                                  👤 {o.nama_approve}
                                </span>
                              )}
                              <span className="text-[11px] font-mono py-0.5 px-2 bg-zinc-950/70 border border-zinc-800 text-zinc-450 rounded-md font-bold">
                                {o.id_order}
                              </span>
                              {o.is_booster && (
                                <span className="bg-red-700 text-white font-mono text-[9px] font-extrabold px-2 py-0.5 rounded-md animate-pulse">
                                  BOOSTER
                                </span>
                              )}
                              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-md border ${colorClass}`}>
                                Prioritas: {timerText}
                              </span>
                              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-md border ${colorClass}`}>
                                {formatDeadlineDateAndTime(o.datetime_deadline)}
                              </span>
                              {o.acc_operator && (
                                <span className="text-[10px] font-sans font-bold bg-[#064e3b]/80 border border-[#065f46]/60 text-[#a7f3d0] px-2 py-0.5 rounded-md shadow flex items-center gap-1 shrink-0 select-none">
                                  🛡️ {o.acc_operator}
                                </span>
                              )}
                            </div>

                            <h3 className="text-2xl font-bold tracking-tight text-white mt-1">
                              {o.nama_customer}
                            </h3>

                            <div className="text-base text-cyan-400 font-extrabold tracking-wide uppercase">
                              {o.nama_produk}
                            </div>

                            <div className="text-xs font-semibold text-zinc-400 font-sans">
                              Jumlah pesanan: <span className="font-mono text-emerald-400 text-sm font-bold">{o.jumlah}</span> pcs
                            </div>

                            {o.link_file_desain && (
                              <div className="text-[11px] font-mono text-cyan-400 mt-1 hover:underline truncate">
                                📂 File: {o.link_file_desain}
                              </div>
                            )}
                            {o.notes && (
                              <div className="text-xs text-zinc-350 italic bg-zinc-955/40 p-2 rounded-lg border border-zinc-900/40">
                                Catatan: "{o.notes}"
                              </div>
                            )}
                          </div>

                          {/* Middle: Active pipeline progress visualization */}
                          <div className="flex-grow flex flex-col items-center justify-center p-4 bg-[#0a0a0c]/60 rounded-xl border border-zinc-900/60 font-sans">
                            <div className="text-[10px] uppercase font-mono tracking-widest text-[#a1a1aa] mb-2 font-bold select-none">
                              Kanal Penugasan Rantai Rute Aktif
                            </div>
                            <div className="flex flex-wrap items-center justify-center gap-1.5 md:my-1">
                              {o.alur_divisi?.map((div, i) => {
                                const isPassed = i < o.status_rute_sekarang;
                                const isActive = i === o.status_rute_sekarang;
                                
                                let badgeBg = "bg-zinc-900/40 text-zinc-550 border-zinc-850/80";
                                if (isPassed) {
                                  badgeBg = "bg-[#0b0b0d] text-zinc-650 border-transparent line-through text-zinc-600";
                                } else if (isActive) {
                                  badgeBg = "bg-emerald-600 text-white border-emerald-400 font-bold animate-pulse shadow-lg";
                                  if (o.status_kendala) badgeBg = "bg-red-750 border-red-500 text-white font-bold animate-bounce";
                                }

                                return (
                                  <React.Fragment key={i}>
                                    {i > 0 && <span className="text-[10px] text-zinc-700">➔</span>}
                                    <div className={`px-2.5 py-1 text-xs rounded-lg border shrink-0 font-bold ${badgeBg}`}>
                                      {div}
                                    </div>
                                  </React.Fragment>
                                );
                              })}
                            </div>
                          </div>

                          {/* Right side: Urgent / Obstacle alerts, and Position indicator */}
                          <div className="flex flex-col items-start md:items-end justify-center min-w-[210px] shrink-0 space-y-2.5 mt-2 md:mt-0 pt-3 md:pt-0 border-t md:border-t-0 border-zinc-900/50">
                            <div className="text-right self-stretch font-sans">
                              <span className="text-[10px] font-sans font-semibold tracking-wider text-zinc-400 block mb-1 font-sans">
                                KAWAL KOORDINAT SEKARANG:
                              </span>
                              <span className={`text-[12.5px] font-sans font-extrabold uppercase py-1.5 px-3.5 rounded-xl block text-center truncate ${
                                o.status_kendala 
                                  ? 'bg-red-955/60 text-red-100 border border-red-900/60'
                                  : 'bg-emerald-955/35 text-emerald-300 border border-emerald-900/40'
                              }`}>
                                [{activeWs}] ➔ {activeDiv}
                              </span>
                            </div>

                            {o.is_pending ? (
                              <div className="bg-amber-955/80 border border-amber-500/40 p-2.5 rounded-xl flex items-center gap-2 self-stretch shadow-md animate-pulse">
                                <Pause className="h-5 w-5 text-amber-500 shrink-0" />
                                <div className="text-xs font-sans text-left">
                                  <span className="font-extrabold text-amber-500 block">DITANGGUHKAN (PENDING)</span>
                                  <span className="text-zinc-400">Orderan dihentikan oleh Admin / Superuser</span>
                                </div>
                              </div>
                            ) : o.status_kendala ? (
                              <div className="bg-red-955/80 border border-red-500/40 p-2.5 rounded-xl flex items-center gap-2 self-stretch shadow-md">
                                <AlertTriangle className="h-5 w-5 text-red-500 shrink-0" />
                                <div className="text-xs font-sans text-left">
                                  <span className="font-extrabold text-[#fca5a5] block">TERHENTI (KENDALA AKTIF)</span>
                                  <span className="text-zinc-350">{o.jenis_kendala}</span>
                                </div>
                              </div>
                            ) : (
                              <div className="bg-zinc-950/60 border border-zinc-900 py-1.5 px-3 rounded-lg text-xs font-mono text-zinc-455 self-stretch text-center font-bold flex items-center justify-center gap-2">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                <span>✔ Antrean Berjalan Normal</span>
                              </div>
                            )}
                            
                            {/* Admin delete & manage buttons right here on read-only for high admin visibility */}
                            <div className="flex items-center gap-2 w-full font-sans">
                              {(userRole === 'Operational' || userRole === 'Admin' || userRole === 'Display Monitoring Admin') && (
                                <button
                                  onClick={(e) => handleTogglePending(o.id_order, e)}
                                  className={`flex-1 ${
                                    o.is_pending 
                                      ? 'bg-amber-600 hover:bg-amber-555 text-white' 
                                      : 'bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-amber-500 hover:text-amber-450'
                                  } text-[11px] font-mono font-bold py-2.5 px-3 rounded-lg transition-all cursor-pointer text-center shadow-md flex items-center justify-center gap-1.5`}
                                  title={o.is_pending ? 'Lanjutkan proses orderan' : 'Ditetapkan pending (berhenti sementara) untuk operator'}
                                >
                                  {o.is_pending ? <Play className="h-3.5 w-3.5 shrink-0" /> : <Pause className="h-3.5 w-3.5 shrink-0" />}
                                  <span>{o.is_pending ? 'Lanjutkan' : 'Pending'}</span>
                                </button>
                              )}

                              {(userRole === 'Operational' || userRole === 'Admin') && (
                                <button
                                  onClick={() => handleOpenEditOrder(o)}
                                  className="flex-1 bg-cyan-955/65 hover:bg-cyan-900 border border-cyan-800/40 text-cyan-400 hover:text-cyan-300 text-[11px] font-mono font-bold py-2.5 px-3 rounded-lg transition-all cursor-pointer text-center shadow-md flex items-center justify-center gap-1.5"
                                  title="Edit data orderan secara langsung"
                                >
                                  <Edit2 className="h-3.5 w-3.5 shrink-0" />
                                  <span>Edit</span>
                                </button>
                              )}

                              {(userRole === 'Operational' || userRole === 'Admin') && (
                                <button
                                  onClick={() => handleDeleteOrder(o.id_order)}
                                  className="bg-zinc-900 hover:bg-[#1f1212] border border-zinc-850 hover:border-red-950 text-zinc-455 hover:text-red-450 p-2.5 rounded-lg transition-all cursor-pointer shrink-0"
                                  title="Hapus Orderan"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          </div>

                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                );
              })()}
            </div>
          </div>
        )}

        {activeTab === 'operator' && (
          <div className="bento-card p-6 shadow-2xl">
            
            {/* Operator Login Header bar simulated */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-855 pb-4 mb-6">
              <div>
                <div className="flex items-center gap-2">
                  <div className="p-1 px-2.5 bg-zinc-900 border border-zinc-800 text-emerald-400 font-mono font-bold text-xs rounded-md">
                    COMP-PC-STATION
                  </div>
                  <h2 className="text-xl font-display font-medium text-white">
                    Monitor Divisi Produksi Terhubung
                  </h2>
                </div>
                <p className="text-xs text-zinc-400 mt-1.5 font-sans">
                  Urutan di bawah disortir berdasarkan Prioritas Mutlak: Booster/Urgent di barisan paling atas, kemudian disusul oleh tenggat waktu (deadline) terdekat.
                </p>
              </div>

              {/* Dropdown station select */}
              <div className="flex items-center gap-3 bg-zinc-900 border border-zinc-850 p-2.5 rounded-2xl shrink-0">
                <span className="text-xs font-semibold text-zinc-350">Konfigurasi Divisi PC:</span>
                {userRole === 'Operator Workstation Blackpaint' ? (
                  <select
                    value={operatorDivision}
                    onChange={(e) => setOperatorDivision(e.target.value)}
                    className="bg-zinc-950 border border-zinc-800 text-emerald-400 text-xs font-mono font-bold rounded-xl px-3.5 py-2 outline-none cursor-pointer focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/25"
                  >
                    <option value="All Blackpaint">Semua Sub-Divisi Blackpaint</option>
                    <option value="Bordir">Sub-Divisi: Bordir</option>
                    <option value="Cutting">Sub-Divisi: Cutting</option>
                    <option value="Faktur">Sub-Divisi: Faktur</option>
                    <option value="Highres">Sub-Divisi: Highres</option>
                    <option value="Laser">Sub-Divisi: Laser</option>
                    <option value="Souvenir">Sub-Divisi: Souvenir</option>
                    <option value="Spanduk">Sub-Divisi: Spanduk</option>
                    <option value="Uv">Sub-Divisi: Uv</option>
                  </select>
                ) : userRole === 'Operator Workstation Reseller' ? (
                  <select
                    value={operatorDivision}
                    onChange={(e) => setOperatorDivision(e.target.value)}
                    className="bg-zinc-950 border border-zinc-800 text-blue-400 text-xs font-mono font-bold rounded-xl px-3.5 py-2 outline-none cursor-pointer focus:border-blue-500 focus:ring-1 focus:ring-blue-500/25"
                  >
                    <option value="All Reseller">Semua Sub-Divisi Reseller</option>
                    <option value="Cutting Reseller">Sub-Divisi: Cutting Reseller</option>
                    <option value="Highres Reseller">Sub-Divisi: Highres Reseller</option>
                    <option value="Laser Reseller">Sub-Divisi: Laser Reseller</option>
                    <option value="Spanduk Reseller">Sub-Divisi: Spanduk Reseller</option>
                  </select>
                ) : userRole === 'Operator Workstation Folder' ? (
                  <select
                    value={operatorDivision}
                    onChange={(e) => setOperatorDivision(e.target.value)}
                    className="bg-zinc-950 border border-zinc-800 text-amber-400 text-xs font-mono font-bold rounded-xl px-3.5 py-2 outline-none cursor-pointer focus:border-amber-500 focus:ring-1 focus:ring-amber-500/25"
                  >
                    <option value="All Folder">Semua Sub-Divisi Folder</option>
                    <option value="Laser Cutting">Sub-Divisi: Laser Cutting</option>
                    <option value="Direct Sublim">Sub-Divisi: Direct Sublim</option>
                    <option value="DTF">Sub-Divisi: DTF</option>
                    <option value="Jahit">Sub-Divisi: Jahit</option>
                    <option value="Sublim">Sub-Divisi: Sublim</option>
                    <option value="Sublim Press">Sub-Divisi: Sublim Press</option>
                    <option value="Sablon">Sub-Divisi: Sablon</option>
                  </select>
                ) : (
                  // General/Admin dropdown with options
                  <select
                    value={operatorDivision}
                    onChange={(e) => setOperatorDivision(e.target.value)}
                    className="bg-zinc-950 border border-zinc-800 text-emerald-400 text-xs font-mono font-bold rounded-xl px-3.5 py-2 outline-none cursor-pointer focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/25"
                  >
                    <option value="All Blackpaint">Semua Sub-Divisi Blackpaint</option>
                    <option value="All Reseller">Semua Sub-Divisi Reseller</option>
                    <option value="All Folder">Semua Sub-Divisi Folder</option>
                    {DIVISI_LIST.map(div => (
                      <option key={div.id} value={div.id}>{div.name}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            {/* List queue showing */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-semibold tracking-wider text-zinc-450 uppercase font-mono">
                  Daftar Antrean Aktif - Divisi {operatorDivision}
                </h3>
                <span className="text-xs text-emerald-400 font-mono bg-emerald-950/30 py-1.5 px-3 border border-emerald-900/40 rounded-xl">
                  Total antrean aktif: {getFilteredAndSortedOperatorOrders(operatorDivision).length}
                </span>
              </div>

              <div className="space-y-4">
                {getFilteredAndSortedOperatorOrders(operatorDivision).length === 0 ? (
                  <div className="border border-zinc-850 border-dashed rounded-2xl py-24 text-center">
                    <CheckCircle2 className="h-14 w-14 text-zinc-700 mx-auto mb-4" />
                    <h4 className="font-bold text-lg text-zinc-300">Semua Pekerjaan Selesai</h4>
                    <p className="text-xs text-zinc-500 max-w-sm mx-auto mt-1">
                      Tidak ada pesanan antrean aktif untuk divisi {operatorDivision} saat ini. Silakan berkordinasi dengan rekanan departemen lain.
                    </p>
                  </div>
                ) : (
                  <AnimatePresence mode="popLayout" initial={false}>
                    {getFilteredAndSortedOperatorOrders(operatorDivision).map(o => {
                      const { text: timerText, colorClass, cardBgClass, urgency } = getTimerDetails(o);
                      const { route } = getProductRouteDetails(o.nama_produk, o.alur_divisi);
                      
                      let nextStepLabel = 'Selesai Produksi (Arsipkan)';
                      if (route && o.status_rute_sekarang + 1 < route.divisions.length) {
                        const nextDivName = route.divisions[o.status_rute_sekarang + 1];
                        nextStepLabel = `Selesai, Oper ke ${nextDivName}`;
                      }

                      return (
                        <motion.div
                          layout
                          key={o.id_order}
                          initial={{ opacity: 0, y: 15 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95, x: 50 }}
                          transition={{ type: "spring", stiffness: 350, damping: 30 }}
                          className={`rounded-2xl border p-5 transition-all relative ${cardBgClass}`}
                        >
                          {/* Pending Warning Ribbon */}
                          {o.is_pending && (
                            <div className="absolute top-2.5 left-2.5 right-2.5 bg-amber-955/95 border border-amber-500/40 text-amber-200 rounded-xl text-xs py-2.5 px-4 flex items-center justify-between gap-3 shadow-lg z-10 animate-pulse">
                              <span className="flex items-center gap-2">
                                <Pause className="h-4 w-4 text-amber-500 shrink-0" />
                                <span className="font-sans font-bold uppercase tracking-wide">ORDERAN DI-PENDING OLEH ADMIN! Pengerjaan Dihentikan Sementara.</span>
                              </span>
                            </div>
                          )}

                          {/* Obstacle Warning Ribbon */}
                          {!o.is_pending && o.status_kendala && (
                            <div className="absolute top-2.5 left-2.5 right-2.5 bg-red-955/95 border border-red-500/40 text-red-200 rounded-xl text-xs py-2 px-4 flex items-center justify-between gap-3 shadow-lg z-10 animate-pulse-red">
                              <span className="flex items-center gap-2">
                                <AlertTriangle className="h-4 w-4 animate-bounce text-red-100" />
                                <span className="font-sans font-bold">KENDALA AKTIF ({o.jenis_kendala}) terjadi di workstation ini!</span>
                              </span>
                              <button
                                onClick={() => handleResolveObstacle(o.id_order)}
                                className="bg-red-650 hover:bg-red-605 text-white font-mono font-bold text-[10px] py-1.5 px-3 rounded-lg tracking-wider transition-all cursor-pointer"
                              >
                                Selesaikan Kendala
                              </button>
                            </div>
                          )}

                          <div className={`flex flex-col lg:flex-row lg:items-center justify-between gap-4 ${(o.is_pending || o.status_kendala) ? 'pt-12' : ''}`}>
                            <div className="flex-grow space-y-2">
                              
                              <div className="flex flex-wrap items-center gap-2">
                                {o.nama_approve && (
                                  <span className="text-[10px] font-sans font-bold bg-[#1e1b4b]/80 border border-[#312e81]/60 text-[#a5b4fc] px-2 py-0.5 rounded-md shadow flex items-center gap-1 shrink-0 select-none">
                                    👤 {o.nama_approve}
                                  </span>
                                )}
                                <span className="text-xs font-mono font-bold text-zinc-450">{o.id_order}</span>
                                {o.is_booster && (
                                  <span className="bg-red-950/60 border border-red-800/80 text-red-400 text-[9px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-md animate-pulse flex items-center gap-1">
                                    <Zap className="h-3 w-3" /> BOOSTER / SUPER URGENT
                                  </span>
                                )}
                                
                                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-md border ${colorClass}`}>
                                  Prioritas: {timerText}
                                </span>
                                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-md border ${colorClass}`}>
                                  {formatDeadlineDateAndTime(o.datetime_deadline)}
                                </span>
                                {o.acc_operator && (
                                  <span className="text-[10px] font-sans font-bold bg-[#064e3b]/80 border border-[#065f46]/60 text-[#a7f3d0] px-2 py-0.5 rounded-md shadow flex items-center gap-1 shrink-0 select-none">
                                    🛡️ {o.acc_operator}
                                  </span>
                                )}
                              </div>

                              <div>
                                <h3 className="font-bold text-lg text-zinc-100 font-sans">{o.nama_customer}</h3>
                                <p className="text-sm text-zinc-400">
                                  Produk: <span className="font-bold text-emerald-400">{o.nama_produk}</span> - Jumlah: <span className="font-mono text-amber-400 font-bold">{o.jumlah}</span> pcs
                                </p>
                              </div>

                              {o.notes && (
                                <div className="bg-zinc-950/60 border border-zinc-900 p-3 rounded-xl text-xs text-zinc-450 italic">
                                  Catatan Penting: "{o.notes}"
                                </div>
                              )}

                              {/* visual steps bar */}
                              <div className="flex flex-wrap items-center gap-y-3 gap-x-1.5 text-[10px] text-zinc-400 pt-3 border-t border-zinc-855 mt-2">
                                <span className="text-zinc-[450] tracking-wide font-mono mr-1 self-start mt-1.5">Mekanisme Alur Rute:</span>
                                <div className="flex flex-wrap items-center gap-1.5">
                                  {route?.divisions.map((div, idx) => {
                                    const isActive = idx === o.status_rute_sekarang;
                                    const isCompleted = idx < o.status_rute_sekarang;
                                    return (
                                      <React.Fragment key={idx}>
                                        <div className="flex flex-col items-center gap-1.5">
                                          <span
                                            className={`px-2 py-0.5 rounded font-mono ${
                                              isActive
                                                ? 'bg-amber-400 text-zinc-950 font-bold border border-amber-300'
                                                : isCompleted
                                                ? 'bg-zinc-900/60 border border-zinc-850/65 text-zinc-500 line-through'
                                                : 'bg-zinc-955 border border-zinc-900 text-zinc-705'
                                            }`}
                                          >
                                            {div}
                                          </span>
                                          <div className="h-4 flex items-center justify-center">
                                            {isActive && (
                                              <span className="text-[9.5px] font-bold font-mono text-amber-400 bg-[#09090b]/80 px-1 rounded border border-zinc-800 tracking-tighter shrink-0 select-none">
                                                ⏱️ {getElapsedTimerText(o.tanggal_input, o.tanggal_update_rute)}
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                        {idx < route.divisions.length - 1 && (
                                          <span className="text-zinc-700 text-xs font-bold shrink-0 self-start mt-1.5">➔</span>
                                        )}
                                      </React.Fragment>
                                    );
                                  })}
                                </div>
                              </div>

                            </div>

                            {/* Interactive action controls */}
                            <div className="flex flex-row lg:flex-col items-center lg:items-end gap-2.5 shrink-0 justify-end">
                              
                              {o.is_pending ? (
                                <button
                                  disabled
                                  className="w-full sm:w-auto font-bold text-xs py-2.5 px-4.5 rounded-xl bg-zinc-950/40 text-amber-550 border border-amber-900/60 flex items-center justify-center gap-1.5 cursor-not-allowed font-mono opacity-80 animate-pulse"
                                  title="Orderan sedang ditangguhkan (PENDING) oleh Admin."
                                >
                                  <Pause className="h-4 w-4 shrink-0 text-amber-500" />
                                  <span>STATUS PENDING</span>
                                </button>
                              ) : o.status_kendala ? (
                                <button
                                  disabled
                                  className="w-full sm:w-auto font-bold text-xs py-2.5 px-4.5 rounded-xl bg-zinc-900 text-zinc-500 border border-zinc-800/80 flex items-center justify-center gap-1.5 cursor-not-allowed font-mono opacity-50"
                                  title="Selesaikan kendala aktif terlebih dahulu sebelum mengoper rute."
                                >
                                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                                  <span>Rute Terbuntu</span>
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleCompleteAndOper(o.id_order)}
                                  className={`w-full sm:w-auto font-bold text-xs py-2.5 px-4.5 rounded-xl transform hover:scale-[1.02] active:scale-98 transition-all text-white flex items-center justify-center gap-1.5 cursor-pointer shadow-lg font-mono ${
                                    urgency === 'urgent'
                                      ? 'bg-red-650 hover:bg-red-600'
                                      : 'bg-emerald-600 hover:bg-emerald-555'
                                  }`}
                                >
                                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                                  <span>{nextStepLabel}</span>
                                </button>
                              )}

                              {!o.is_pending && !o.status_kendala && (
                                <button
                                  onClick={() => setObstacleTargetOrderId(o.id_order)}
                                  className="w-full sm:w-auto text-red-105 hover:text-red-300 border border-red-500/25 hover:bg-red-950/30 text-[11px] font-mono font-bold py-2 px-3.5 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
                                >
                                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                                  <span>Laporkan Kendala</span>
                                </button>
                              )}

                            </div>

                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                )}
              </div>
            </div>

          </div>
        )}

        {/* TAB: MASTER SETTING RUTE RANTAI PRODUK */}
        {activeTab === 'master_rute' && (
          <div className="space-y-6">
            {userRole !== 'Operational' ? (
              <div className="bento-card p-10 text-center max-w-xl mx-auto my-12 space-y-6 shadow-2xl animate-fade-in border border-zinc-800">
                <div className="mx-auto w-16 h-16 bg-red-950/40 border border-red-500/30 rounded-2xl flex items-center justify-center text-red-500 text-3xl animate-bounce">
                  <Lock className="w-8 h-8 text-red-500" />
                </div>
                <h2 className="text-xl font-bold text-white font-sans">Akses Terbatas: Hak Otorisasi Dibutuhkan</h2>
                <p className="text-zinc-400 text-sm leading-relaxed font-sans">
                  Halaman <strong className="text-teal-400">"Master Setting Rute Rantai"</strong> hanya boleh diakses oleh user dengan Role <strong className="text-emerald-400 font-mono">Operational (Super Admin)</strong>.
                </p>
                <div className="bg-zinc-950/60 p-4 rounded-xl border border-zinc-900 text-xs text-zinc-500 font-mono text-left space-y-2">
                  <p className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-red-500 shrink-0" />
                    <span>Akun Deteksi: <strong className="text-zinc-300">operasionalblackpaint@gmail.com</strong></span>
                  </p>
                  <p className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-red-500 shrink-0" />
                    <span>Peran Sesi Aktif: <strong className="text-zinc-300">{userRole}</strong></span>
                  </p>
                  <p className="text-[10px] text-zinc-500 mt-2 font-sans italic leading-tight">
                    * Panduan Penguji: Silakan beralih kembali ke Role "Operational (Super Admin)" pada pemilih sesi di pojok kanan atas layar untuk membuka akses halaman ini.
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in items-start">
                
                {/* Information Header Block */}
                <div className="lg:col-span-12 bento-card p-5 flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <Sliders className="h-6 w-6 text-teal-400 shrink-0" />
                    <div>
                      <h3 className="font-semibold text-zinc-100 text-base">Master Setting Rute Rantai Produk (Operational Only)</h3>
                      <p className="text-xs text-zinc-400 mt-0.5 font-sans">
                        Buat, ubah, dan kelola alur penugasan rantai divisi produksi secara dinamis. Perubahan rute di tabel ini akan langsung diterapkan secara real-time pada pesanan baru yang diinput.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 bg-teal-950/30 border border-teal-900/50 text-teal-400 px-3.5 py-1.5 rounded-xl font-mono text-xs">
                    <span className="h-2 w-2 rounded-full bg-teal-450 animate-ping mr-1"></span>
                    <span>Firebase Centred DB Status: Online</span>
                  </div>
                </div>

                {/* Left Column: List/Table of Route (65%) */}
                <div className="lg:col-span-7 bento-card p-6 space-y-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-zinc-800 pb-4">
                    <div>
                      <h4 className="font-bold text-zinc-100 text-sm uppercase tracking-wider">Daftar Rantai Rute Produk</h4>
                      <p className="text-[11px] text-zinc-500">Membaca dari tabel master_rute_produk terpusat ({masterRoutes.length} Item Terdaftar)</p>
                    </div>
                    {userRole === 'Operational' && (orders.length > 0 || masterRoutes.length > 0) && (
                      <button
                        type="button"
                        onClick={handleClearAllDatabase}
                        className="text-xs bg-red-950/20 hover:bg-red-900 border border-red-900/40 text-red-400 hover:text-white px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0"
                      >
                        <Trash2 className="h-3.5 w-3.5 shrink-0" />
                        <span>Kosongkan Database</span>
                      </button>
                    )}
                  </div>

                  {/* Search box */}
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
                    <input
                      type="text"
                      placeholder="Cari produk terdaftar..."
                      id="search_route_produk"
                      onChange={(e) => {
                        const q = e.target.value.toLowerCase();
                        const rows = document.querySelectorAll('.route-table-row');
                        rows.forEach((row) => {
                          const text = row.getAttribute('data-name')?.toLowerCase() || '';
                          if (text.includes(q)) {
                            (row as HTMLElement).style.display = 'table-row';
                          } else {
                            (row as HTMLElement).style.display = 'none';
                          }
                        });
                      }}
                      className="w-full bg-zinc-950 text-zinc-100 text-xs rounded-xl border border-zinc-850 px-9 py-2.5 outline-none focus:border-teal-700 transition-[#09090b] font-sans"
                    />
                  </div>

                  <div className="overflow-x-auto w-full scrollbar-thin">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-zinc-800 text-zinc-400 text-[10px] uppercase font-bold tracking-wider">
                          <th className="py-3 px-2">ID Produk</th>
                          <th className="py-3 px-2">Nama Produk / Alur Rantai Penugasan</th>
                          <th className="py-3 px-2 text-right">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-900/40">
                        {masterRoutes.map((m) => (
                          <tr
                            key={m.id_produk}
                            className="route-table-row hover:bg-zinc-900/30 transition-colors"
                            data-name={m.nama_produk}
                          >
                            <td className="py-3 px-2 font-mono text-zinc-500 text-[10px] whitespace-nowrap">
                              {m.id_produk}
                            </td>
                            <td className="py-3 px-2 space-y-1.5">
                              <span className="font-bold text-zinc-200 block text-xs">{m.nama_produk}</span>
                              <div className="flex flex-wrap items-center gap-1">
                                {m.alur_divisi.map((div, i) => (
                                  <React.Fragment key={i}>
                                    <span className="px-1.5 py-0.5 rounded bg-teal-950/40 text-[9px] font-mono text-teal-450 border border-teal-900/60 font-bold">
                                      {div}
                                    </span>
                                    {i < m.alur_divisi.length - 1 && (
                                      <ArrowRight className="h-3 w-3 text-zinc-700 shrink-0" />
                                    )}
                                  </React.Fragment>
                                ))}
                              </div>
                            </td>
                            <td className="py-3 px-2 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => {
                                    setEditingRouteId(m.id_produk);
                                    setEditRouteName(m.nama_produk);
                                    setEditRouteDivisions([...m.alur_divisi]);
                                    const element = document.getElementById('route-editor-panel');
                                    if (element) element.scrollIntoView({ behavior: 'smooth' });
                                  }}
                                  className="p-1 px-2.5 bg-zinc-900 hover:bg-amber-950/40 border border-zinc-800 hover:border-amber-900/60 rounded-lg text-[10px] text-amber-400 hover:text-amber-300 font-bold font-sans transition-all cursor-pointer flex items-center gap-1 shadow-md"
                                >
                                  <Edit2 className="h-2.5 w-2.5" />
                                  <span>Edit Rute</span>
                                </button>
                                <button
                                  onClick={() => {
                                    setConfirmConfig({
                                      title: 'Hapus Rute Produk Master',
                                      message: `Apakah Anda yakin ingin menghapus rute produk "${m.nama_produk}" dari tabel master? Tindakan ini akan menghapus alurnya dan tidak dapat dikembalikan.`,
                                      confirmText: 'Hapus Rute',
                                      type: 'danger',
                                      onConfirm: async () => {
                                        try {
                                          await deleteDoc(doc(db, 'master_rute_produk', m.id_produk));
                                          if (editingRouteId === m.id_produk) {
                                            setEditingRouteId(null);
                                            setEditRouteName('');
                                            setEditRouteDivisions([]);
                                          }
                                        } catch (err) {
                                          handleFirestoreError(err, OperationType.DELETE, `master_rute_produk/${m.id_produk}`);
                                        }
                                      }
                                    });
                                  }}
                                  className="p-1 px-2 bg-zinc-900 hover:bg-red-950/40 border border-zinc-800 hover:border-red-900/60 rounded-lg text-[10px] text-red-400 hover:text-red-300 font-semibold font-sans transition-all cursor-pointer shadow-md"
                                >
                                  <Trash2 className="h-2.5 w-2.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Right Column: Interactive Editor Form Panel (35%) */}
                <div id="route-editor-panel" className="lg:col-span-5 bento-card p-6 space-y-4">
                  <div className="border-b border-zinc-800 pb-3">
                    <h4 className="font-bold text-zinc-100 text-sm uppercase tracking-wider flex items-center gap-2">
                      <Workflow className="h-4 w-4 text-teal-400 shrink-0" />
                      <span>{editingRouteId ? 'Edit Rantai Rute Produk' : 'Tambah Produk & Rute Baru'}</span>
                    </h4>
                    <p className="text-[11px] text-zinc-500 mt-1">
                      {editingRouteId ? `Mengubah rute produk: ${editRouteName}` : 'Masukkan nama produk dan tentukan susunan departemen produksinya.'}
                    </p>
                  </div>

                  {/* Form inputs */}
                  <form onSubmit={async (e) => {
                    e.preventDefault();
                    if (editingRouteId) {
                      if (!editRouteName.trim() || editRouteDivisions.length === 0) return;
                      const routeObj: MasterRuteProduk = {
                        id_produk: editingRouteId,
                        nama_produk: editRouteName.trim(),
                        alur_divisi: editRouteDivisions
                      };
                      try {
                        await setDoc(doc(db, 'master_rute_produk', editingRouteId), routeObj);
                        setEditingRouteId(null);
                        setEditRouteName('');
                        setEditRouteDivisions([]);
                      } catch (err) {
                        handleFirestoreError(err, OperationType.WRITE, `master_rute_produk/${editingRouteId}`);
                      }
                    } else {
                      if (!newRouteName.trim() || newRouteDivisions.length === 0) {
                        alert('Silakan masukkan nama produk!');
                        return;
                      }
                      
                      const hasDuplicate = masterRoutes.some(m => m.nama_produk.toLowerCase() === newRouteName.trim().toLowerCase());
                      if (hasDuplicate) {
                        alert(`Produk dengan nama "${newRouteName}" sudah terdaftar di database!`);
                        return;
                      }

                      const newId = `prod_${newRouteName.trim().toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
                      const newProd: MasterRuteProduk = {
                        id_produk: newId,
                        nama_produk: newRouteName.trim(),
                        alur_divisi: newRouteDivisions
                      };
                      try {
                        await setDoc(doc(db, 'master_rute_produk', newId), newProd);
                        setNewRouteName('');
                        setNewRouteDivisions(['Cutting']);
                      } catch (err) {
                        handleFirestoreError(err, OperationType.WRITE, `master_rute_produk/${newId}`);
                      }
                    }
                  }} className="space-y-4">
                    
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-zinc-400 mb-1.5 font-sans">
                        Nama Produk *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Contoh: Sticker Hologram, PIN Magnet"
                        value={editingRouteId ? editRouteName : newRouteName}
                        onChange={(e) => {
                          if (editingRouteId) setEditRouteName(e.target.value);
                          else setNewRouteName(e.target.value);
                        }}
                        className="w-full bg-zinc-950 text-zinc-100 text-xs rounded-xl border border-zinc-850 px-3 py-2.5 outline-none focus:border-teal-700 transition"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="block text-[10px] uppercase font-bold text-zinc-400 font-sans">
                          Kerangka Susunan Rantai Divisi
                        </label>
                      </div>

                      {/* Dynamic step builder layout */}
                      <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1 scrollbar-thin">
                        {(editingRouteId ? editRouteDivisions : newRouteDivisions).map((currentDiv, stepIdx) => (
                          <div key={stepIdx} className="flex items-center gap-2 bg-zinc-950 p-2 border border-zinc-900 rounded-xl">
                            <span className="w-5 h-5 flex items-center justify-center bg-teal-950/60 border border-teal-900 text-[10px] font-bold text-teal-400 font-mono rounded-full shrink-0">
                              {stepIdx + 1}
                            </span>
                            
                            <select
                              value={currentDiv}
                              onChange={(e) => {
                                const list = editingRouteId ? [...editRouteDivisions] : [...newRouteDivisions];
                                list[stepIdx] = e.target.value;
                                if (editingRouteId) setEditRouteDivisions(list);
                                else setNewRouteDivisions(list);
                              }}
                              className="flex-grow bg-zinc-900 border border-zinc-800 text-zinc-100 text-[11px] rounded-lg px-2.5 py-1.5 outline-none focus:border-teal-600 font-mono cursor-pointer"
                            >
                              {DIVISI_LIST.map(div => (
                                <option key={div.id} value={div.id}>{div.name}</option>
                              ))}
                            </select>

                            <button
                              type="button"
                              onClick={() => {
                                const list = editingRouteId ? [...editRouteDivisions] : [...newRouteDivisions];
                                if (list.length > 1) {
                                  list.splice(stepIdx, 1);
                                  if (editingRouteId) setEditRouteDivisions(list);
                                  else setNewRouteDivisions(list);
                                }
                              }}
                              disabled={(editingRouteId ? editRouteDivisions : newRouteDivisions).length <= 1}
                              className="p-1.5 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 hover:border-red-950-40 hover:text-red-400 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>

                      {/* Button to add step */}
                      <button
                        type="button"
                        onClick={() => {
                          const list = editingRouteId ? [...editRouteDivisions] : [...newRouteDivisions];
                          list.push('Cutting');
                          if (editingRouteId) setEditRouteDivisions(list);
                          else setNewRouteDivisions(list);
                        }}
                        className="w-full flex items-center justify-center gap-1.5 py-2.5 border border-dashed border-zinc-800 hover:border-teal-900/80 hover:bg-teal-950/10 text-zinc-400 hover:text-teal-400 rounded-xl text-xs font-semibold select-none cursor-pointer transition-all"
                      >
                        <PlusCircle className="h-3.5 w-3.5" />
                        <span>+ Tambah Langkah Baru</span>
                      </button>
                    </div>

                    <div className="pt-2 flex gap-2">
                      <button
                        type="submit"
                        className="flex-grow bg-teal-605 bg-teal-600 hover:bg-teal-500 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition shadow-md shadow-teal-950/25 flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Save className="h-3.5 w-3.5" />
                        <span>{editingRouteId ? 'SIMPAN PERUBAHAN DB' : 'DAFTARKAN PRODUK BARU'}</span>
                      </button>
                      
                      {editingRouteId && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingRouteId(null);
                            setEditRouteName('');
                            setEditRouteDivisions([]);
                          }}
                          className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 font-bold py-2.5 px-4 rounded-xl text-xs transition cursor-pointer"
                        >
                          Batal
                        </button>
                      )}
                    </div>

                  </form>
                </div>

                {/* NEW DASHBOARD: KELOLA NAMA APPROVE (Operational Settings Card) */}
                <div className="lg:col-span-12 grid grid-cols-1 md:grid-cols-12 gap-6 pt-6 border-t border-zinc-900 mt-6 font-sans">
                  <div className="md:col-span-12">
                    <div className="flex items-center gap-2.5 mb-2 pl-0.5">
                      <Sliders className="h-5 w-5 text-indigo-400" />
                      <h3 className="font-bold text-zinc-100 text-sm uppercase tracking-wide">
                        KONFIGURASI MASTER NAMA APPROVE (Admin Approver Dashboard)
                      </h3>
                    </div>
                    <p className="text-xs text-zinc-450 mb-3 pl-0.5 font-sans leading-relaxed">
                      Kelola daftar opsi nama approval admin di bawah ini. Nama-nama yang Anda daftarkan di sini secara otomatis akan tersedia sebagai pilihan dropdown pada form input pesanan pihak Admin, dan ditampilkan pada display operator di samping Order ID.
                    </p>
                  </div>

                  {/* Left Column: List/Table of Approvers (7 cols) */}
                  <div className="md:col-span-7 bento-card p-5 space-y-4">
                    <div>
                      <h4 className="font-bold text-zinc-200 text-xs uppercase tracking-wide">Daftar Admin Approve Terdaftar</h4>
                      <p className="text-[11px] text-zinc-500 mt-0.5">Membaca dari tabel master_admin_approvers ({adminApprovers.length} Aktif)</p>
                    </div>

                    {adminApprovers.length === 0 ? (
                      <div className="py-8 text-center border border-dashed border-zinc-850 rounded-2xl">
                        <p className="text-xs text-zinc-500">Belum ada nama approve terdaftar di database.</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto w-full scrollbar-thin">
                        <table className="w-full text-left text-xs border-collapse font-sans">
                          <thead>
                            <tr className="border-b border-zinc-850 text-zinc-400">
                              <th className="py-2.5 px-3 font-semibold text-[10px] uppercase">ID Sistem</th>
                              <th className="py-2.5 px-3 font-semibold text-[10px] uppercase">Nama Approver</th>
                              <th className="py-2.5 px-3 text-right font-semibold text-[10px] uppercase pr-4">Kontrol</th>
                            </tr>
                          </thead>
                          <tbody>
                            {adminApprovers.map((appr) => (
                              <tr key={appr.id} className="border-b border-zinc-900 hover:bg-zinc-950/40 transition animate-fade-in">
                                <td className="py-3 px-3 font-mono text-[10.5px] text-zinc-500 font-bold">{appr.id}</td>
                                <td className="py-3 px-3 font-medium text-zinc-150 text-zinc-200 flex items-center gap-2">
                                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                                  {appr.nama}
                                </td>
                                <td className="py-3 px-3 text-right pr-4">
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteAdminApprover(appr.id, appr.nama)}
                                    className="p-1 px-2.5 rounded-lg bg-red-950/20 hover:bg-red-900/40 text-red-400 hover:text-white border border-red-900/30 text-[10px] font-bold font-sans cursor-pointer transition"
                                  >
                                    Hapus
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Right Column: Add Form (5 cols) */}
                  <div className="md:col-span-5 bento-card p-5">
                    <h4 className="font-bold text-zinc-200 text-xs uppercase tracking-wide mb-3">Registrasi Admin Approve Baru</h4>
                    
                    <form onSubmit={handleAddAdminApprover} className="space-y-4 font-sans">
                      <div>
                        <label className="block text-[10px] uppercase font-bold text-zinc-450 mb-1.5 font-sans">
                          Nama Admin Approve *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="Masukkan nama lengkap / inisial"
                          value={newApproverName}
                          onChange={(e) => setNewApproverName(e.target.value)}
                          className="w-full bg-zinc-950 text-zinc-100 text-xs rounded-xl border border-zinc-850 px-3 py-2.5 outline-none focus:border-indigo-700 transition"
                        />
                      </div>

                      <button
                        type="submit"
                        className="w-full bg-indigo-600 hover:bg-indigo-505 bg-indigo-600 hover:bg-indigo-550 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition shadow-md shadow-indigo-950/25 flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <PlusCircle className="h-3.5 w-3.5" />
                        <span>TAMBAH APPROVE BARU</span>
                      </button>
                    </form>
                  </div>
                </div>

              </div>
            )}
          </div>
        )}

        {/* TAB 4: FLUTTER CODE & LOGIC SPECIFICATIONS (DEACTIVATED) */}
        {activeTab === 'deactivated_flutter_tab' && (
          <div className="bento-card p-6 shadow-2xl animate-fade-in">
            <div className="border-b border-zinc-855 pb-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-zinc-900 border border-zinc-800 text-teal-400 rounded-xl">
                  <FileCode className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl font-display font-medium text-white">Struktur & Kode Integrasi Flutter (Dart)</h2>
                  <p className="text-xs text-zinc-400 mt-1.5 font-sans">
                    Berikut adalah cetak cetak arsitektur sistem satu database real-time terintegrasi di Flutter. Seluruh cetak kode ditulis sesuai dengan standar yang diminta, menggunakan State Management Provider / Stream.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* Flutter Files Side Nav */}
              <div className="lg:col-span-4 space-y-2">
                <span className="text-[10px] font-bold tracking-widest text-zinc-500 uppercase font-mono block pl-2 mb-1.5 animate-pulse">
                  Arsip Berkas Dart
                </span>
                {DART_RESOURCES.map((file, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedDartFileIdx(idx)}
                    className={`w-full text-left p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 ${
                      selectedDartFileIdx === idx
                        ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
                        : 'bg-zinc-900/50 border-zinc-850 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                    }`}
                  >
                    <FileCode className={`h-4 w-4 shrink-0 mt-1 ${selectedDartFileIdx === idx ? 'text-emerald-400' : 'text-zinc-500'}`} />
                    <div>
                      <div className="font-mono text-xs font-bold">{file.filename}</div>
                      <p className="text-[10px] text-zinc-450 mt-0.5 line-clamp-2">
                        {file.description}
                      </p>
                    </div>
                  </button>
                ))}
              </div>

              {/* Code viewer display with syntactical scroll */}
              <div className="lg:col-span-8 flex flex-col border border-zinc-850 rounded-2xl bg-zinc-900/60 overflow-hidden shadow-xl">
                
                {/* Viewer header controls */}
                <div className="bg-zinc-950 px-4 py-3 border-b border-zinc-855 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-amber-500 animate-pulse" />
                    <span className="font-mono text-xs font-bold text-zinc-300">
                      lib/src/{DART_RESOURCES[selectedDartFileIdx].filename}
                    </span>
                  </div>

                  <button
                    onClick={() => handleCopyCode(DART_RESOURCES[selectedDartFileIdx].code, selectedDartFileIdx)}
                    className="flex items-center gap-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-555 text-white py-1.5 px-3 rounded-xl cursor-pointer transform active:scale-95 transition-all shadow-md font-mono"
                  >
                    {copiedMap[selectedDartFileIdx] ? (
                      <>
                        <Check className="h-3.5 w-3.5" />
                        <span>Tersalin!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        <span>Salin Berkas</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Code viewport container */}
                <div className="p-4 overflow-x-auto bg-zinc-950 scrollbar max-h-[550px]">
                  <pre className="text-xs font-mono text-zinc-300 leading-relaxed pointer-events-auto select-text whitespace-pre">
                    <code>{DART_RESOURCES[selectedDartFileIdx].code}</code>
                  </pre>
                </div>

                <div className="bg-zinc-900/65 p-3.5 px-4 border-t border-zinc-855 text-[11px] text-zinc-450 leading-relaxed font-sans italic">
                  * Catatan Implementasi: Kelas {DART_RESOURCES[selectedDartFileIdx].filename.split('.')[0]} di atas mendukung pemutakhiran real-time reaktif (Stream) dan penyusunan urutan prioritas booster serta countdown jatuh tempo secara konsisten.
                </div>

              </div>

            </div>
          </div>
        )}

        {/* TAB 5: MONITOR PENDUKUNG (TV DISPLAY SIMULATION) */}
        {activeTab === 'monitor_tv' && (
          <div className="space-y-6 animate-fade-in font-sans">
            
            {/* Command Center TV Frame Container */}
            <div className="bg-zinc-950 border-4 border-zinc-900 rounded-[2rem] p-6 shadow-2xl relative overflow-hidden flex flex-col min-h-[700px]">
              
              {/* TV Bezel Ambient Glow Line */}
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-red-500 via-emerald-500 to-indigo-500 opacity-20 pointer-events-none" />
              
              {/* TV Status Info Bar */}
              <div className="flex flex-col sm:flex-row items-center justify-between border-b border-zinc-900 pb-5 mb-6">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-red-500 animate-ping" />
                    <span className="text-xs font-mono font-bold tracking-widest text-zinc-500 uppercase">
                      TV-01 // PRODUCTION CHAMBER DISPLAY
                    </span>
                  </div>
                  <h2 className="text-xl md:text-2xl font-bold font-display tracking-tight text-white mt-1">
                    MONITOR PENDUKUNG QUEUE & CMD CENTER
                  </h2>
                </div>
                
                {/* Real-time Digital Clock display with monospace */}
                <div className="flex items-center gap-3 mt-3 sm:mt-0">
                  <span className="text-[10px] font-mono font-bold px-2.5 py-1 bg-zinc-900 border border-zinc-800 text-neutral-400 rounded-md">
                    READ-ONLY MODE (TV DINDING)
                  </span>
                  <div className="bg-zinc-900 text-[15px] font-mono font-bold text-emerald-400 px-3.5 py-2 rounded-xl border border-zinc-800 tracking-wider">
                    {now.toLocaleTimeString('id-ID')}
                  </div>
                </div>
              </div>

              {/* 3 KPI CARDS SIDE-BY-SIDE */}
              {(() => {
                const activeOrdersList = orders.filter(o => !o.is_archived);
                const activeCount = activeOrdersList.length;
                const completedCount = orders.filter(o => o.is_archived).length;
                
                const urgentCount = activeOrdersList.filter(o => {
                  if (o.is_booster) return true;
                  const diffMs = new Date(o.datetime_deadline).getTime() - now.getTime();
                  return diffMs > 0 && (diffMs / (3600 * 1000)) < 2;
                }).length;

                return (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
                    {/* KPI 1: Active queue */}
                    <div className="bg-[#18181b] border-2 border-[#27272a] p-5 rounded-2xl shadow-xl flex flex-col items-center justify-center text-center">
                      <span className="text-xs font-semibold tracking-widest text-zinc-400 font-sans uppercase">
                        TOTAL ANTRIAN AKTIF
                      </span>
                      <span className="text-4xl font-extrabold font-sans text-sky-400 mt-2">
                        {activeCount}
                      </span>
                    </div>

                    {/* KPI 2: Completed today */}
                    <div className="bg-[#18181b] border-2 border-[#27272a] p-5 rounded-2xl shadow-xl flex flex-col items-center justify-center text-center">
                      <span className="text-xs font-semibold tracking-widest text-[#a1a1aa] font-sans uppercase">
                        SELESAI HARI INI
                      </span>
                      <span className="text-4xl font-extrabold font-sans text-emerald-400 mt-2">
                        {completedCount}
                      </span>
                    </div>

                    {/* KPI 3: Urgent / Kritis count with blinking red effect if > 0 */}
                    <div className={`p-5 rounded-2xl shadow-xl border-2 flex flex-col items-center justify-center text-center transition-all duration-500 ${
                      urgentCount > 0 
                        ? 'bg-red-950/80 border-red-500/60 shadow-red-950/40 animate-pulse' 
                        : 'bg-[#18181b] border-[#27272a]'
                    }`}>
                      <span className={`text-xs font-semibold tracking-widest font-sans uppercase ${
                        urgentCount > 0 ? 'text-red-300' : 'text-zinc-400'
                      }`}>
                        ANTREAN KRITIS (&lt; 2 JAM)
                      </span>
                      <span className={`text-4xl font-extrabold font-sans mt-2 ${
                        urgentCount > 0 ? 'text-red-100' : 'text-sky-400'
                      }`}>
                        {urgentCount}
                      </span>
                    </div>
                  </div>
                );
              })()}

              {/* STAGE MAIN TABLE / LIST */}
              <div className="flex-grow overflow-y-auto space-y-4 pr-1">
                {(() => {
                  const activeOrdersList = orders.filter(o => !o.is_archived);
                  
                  if (activeOrdersList.length === 0) {
                    return (
                      <div className="text-center py-16 text-zinc-500 font-sans text-base">
                        Tidak ada antrean pesanan aktif yang sedang diproses.
                      </div>
                    );
                  }

                  // Priority sorting:
                  // 1. is_booster or (< 2 hours remaining) -> RED at the top
                  // 2. warning (2 - 5 hours remaining) -> YELLOW next
                  // 3. safe (> 5 hours remaining) -> GREEN at bottom
                  const sortedList = [...activeOrdersList].sort((a, b) => {
                    const isUrgentA = a.is_booster || (new Date(a.datetime_deadline).getTime() - now.getTime() < 2 * 3600 * 1000);
                    const isUrgentB = b.is_booster || (new Date(b.datetime_deadline).getTime() - now.getTime() < 2 * 3600 * 1000);
                    
                    if (isUrgentA && !isUrgentB) return -1;
                    if (!isUrgentA && isUrgentB) return 1;

                    const remA = new Date(a.datetime_deadline).getTime() - now.getTime();
                    const remB = new Date(b.datetime_deadline).getTime() - now.getTime();
                    return remA - remB;
                  });

                  return (
                    <AnimatePresence mode="popLayout" initial={false}>
                      {sortedList.map((order) => {
                        const diffMs = new Date(order.datetime_deadline).getTime() - now.getTime();
                        const diffHrs = diffMs / (3600 * 1000);
                        
                        const isRed = order.is_booster || diffHrs < 2;
                        const isYellow = !isRed && (diffHrs >= 2 && diffHrs < 5);
                        
                        // Style classes depending on status
                        let bgClass = "bg-[#dcfce7] border-[#10b981]/65 text-[#14532d]";
                        let statusLabelColor = "text-[#15803d]";
                        if (isRed) {
                          bgClass = "bg-[#450a0a] border-[#ef4444]/65 text-white";
                          statusLabelColor = "text-[#fca5a5]";
                        } else if (isYellow) {
                          bgClass = "bg-[#fef9c3] border-[#f59e0b]/65 text-[#78350f]";
                          statusLabelColor = "text-[#b45309]";
                        }

                        // Format remaining countdown
                        let countdownStr = 'LEWAT DEADLINE';
                        if (diffMs > 0) {
                          const h = Math.floor(diffMs / (3600 * 1000));
                          const m = Math.floor((diffMs % (3600 * 1000)) / (60 * 1000));
                          const s = Math.floor((diffMs % (60 * 1000)) / 1000);
                          countdownStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
                        }

                        // Get divisional alur
                        const matchedRoute = masterRoutes.find(
                          r => r.nama_produk.toLowerCase() === order.nama_produk.toLowerCase()
                        );
                        const alurDivisi = order.alur_divisi && order.alur_divisi.length > 0
                          ? order.alur_divisi
                          : matchedRoute
                          ? matchedRoute.alur_divisi
                          : ['Cutting'];

                        return (
                          <motion.div 
                            layout
                            key={order.id_order}
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: -15 }}
                            transition={{ type: "spring", stiffness: 350, damping: 30 }}
                            className={`border-2 rounded-2xl p-5 shadow-lg flex flex-col md:flex-row items-center justify-between gap-4 transition-all duration-300 ${bgClass}`}
                            style={{ fontFamily: 'Calibri, sans-serif' }}
                          >
                            {/* Column 1: CUSTOMER & PRODUCT */}
                            <div className="flex-1 min-w-[250px]">
                              <div className="flex items-center gap-2">
                                {order.is_booster && (
                                  <span className="bg-red-650 bg-red-600 text-white font-mono text-[10px] font-bold px-2 py-0.5 rounded-md animate-pulse shrink-0">
                                    BOOSTER
                                  </span>
                                )}
                                <span className="text-xl font-bold tracking-tight line-clamp-1">
                                  {order.nama_customer}
                                </span>
                              </div>
                              <div className="text-base font-extrabold tracking-wide uppercase mt-1 opacity-90">
                                {order.nama_produk}
                              </div>
                              <div className="text-xs font-semibold mt-1 opacity-75">
                                Jumlah: {order.jumlah} pcs
                              </div>
                            </div>

                            {/* Column 2: DIVISIONS PIPELINE PROGRESS */}
                            <div className="flex-grow flex items-center justify-center flex-wrap gap-1.5 md:mx-6">
                              {alurDivisi.map((div, i) => {
                                const isPassed = i < order.status_rute_sekarang;
                                const isActive = i === order.status_rute_sekarang;

                                let badgeBg = "bg-transparent text-[#475569] border-[#64748b]";
                                if (isRed) {
                                  badgeBg = "bg-transparent text-white/60 border-white/30";
                                }

                                if (isPassed) {
                                  badgeBg = "bg-zinc-500/20 text-zinc-500 border-transparent";
                                  if (isRed) {
                                    badgeBg = "bg-white/10 text-zinc-300 border-transparent";
                                  }
                                } else if (isActive) {
                                  badgeBg = "bg-[#4f46e5] text-white border-[#818cf8] font-bold shadow-md animate-pulse";
                                }

                                return (
                                  <React.Fragment key={i}>
                                    {i > 0 && (
                                      <span className={`text-[10px] mx-0.5 shrink-0 ${isRed ? 'text-[#fca5a5]' : statusLabelColor}`}>
                                        ➔
                                      </span>
                                    )}
                                    <div className={`px-3 py-1 text-xs rounded-lg border shrink-0 ${badgeBg}`}>
                                      {div}
                                    </div>
                                  </React.Fragment>
                                );
                              })}
                            </div>

                            {/* Column 3: COUNTDOWN TIMERS */}
                            <div className="text-right min-w-[150px]">
                              <div className="text-2xl font-black font-mono tracking-wider">
                                {countdownStr}
                              </div>
                              <div className={`text-[10px] font-bold tracking-wider uppercase mt-0.5 ${statusLabelColor}`}>
                                SISA WAKTU DEADLINE
                              </div>
                            </div>

                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  );
                })()}

              </div>

              {/* OVERLAY BANNER DARURAT KENDALA (AT THE BOTTOM OF THE TV MONITOR) */}
              {(() => {
                const kendalaOrder = orders.find(o => o.status_kendala && !o.is_archived);
                if (!kendalaOrder) return null;

                const matchedRoute = masterRoutes.find(
                  r => r.nama_produk.toLowerCase() === kendalaOrder.nama_produk.toLowerCase()
                );
                const alurDivisi = kendalaOrder.alur_divisi && kendalaOrder.alur_divisi.length > 0
                  ? kendalaOrder.alur_divisi
                  : matchedRoute
                  ? matchedRoute.alur_divisi
                  : ['Cutting'];
                const currentDiv = alurDivisi[kendalaOrder.status_rute_sekarang] || 'Cutting';

                return (
                  <div className="bg-[#991b1b] border-t-4 border-[#ef4444] py-4 px-6 mx-[-1.5rem] mb-[-1.5rem] mt-6 flex items-center gap-4 animate-pulse duration-700 shadow-2xl relative z-10">
                    <AlertTriangle className="h-8 w-8 text-white shrink-0 animate-bounce" />
                    <div className="text-white text-sm md:text-base font-black uppercase tracking-wide" style={{ fontFamily: 'Calibri, sans-serif' }}>
                      PERINGATAN: ORDERAN {kendalaOrder.nama_customer} - {kendalaOrder.nama_produk} TERHENTI DI DIVISI {currentDiv} - ALASAN: {kendalaOrder.jenis_kendala}
                    </div>
                  </div>
                );
              })()}

            </div>

            {/* Instruction/Disclaimer under the TV Preview */}
            <div className="bg-zinc-900/40 p-4 border border-zinc-850 rounded-2xl flex items-start gap-3">
              <Sparkles className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-zinc-300">
                  Tentang Monitor TV Produksi (Display-Only)
                </h4>
                <p className="text-[11px] text-zinc-450 mt-1 leading-relaxed font-sans">
                  Layar di atas menampilkan visualisasi dari aplikasi Flutter <strong>MonitorPendukungPage</strong> yang dipadukan ke TV dinding ruang produksi Anda. 
                  Tidak mengandung input atau tombol interaktif guna mencegah ketidaksengajaan operasi di lantai pabrik, serta murni menampilkan pemutakhiran data secara real-time via Firestore database.
                </p>
              </div>
            </div>

          </div>
        )}

        {/* TAB 6: RIWAYAT & ARSIP PEKERJAAN SELESAI */}
        {activeTab === 'riwayat' && (
          <div className="space-y-6 animate-fade-in font-sans">
            
            {/* Header section with Export Button */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-zinc-900/50 p-6 border border-zinc-850 rounded-3xl backdrop-blur-sm">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 bg-emerald-950/60 border border-emerald-800/40 rounded-lg text-emerald-400">
                    <Archive className="h-5 w-5" />
                  </span>
                  <h2 className="text-xl font-display font-bold text-white tracking-tight">
                    Arsip Riwayat Pekerjaan Selesai
                  </h2>
                </div>
                <p className="text-xs text-zinc-400 max-w-2xl">
                  Menampilkan semua orderan yang telah diselesaikan pengerjaannya oleh operator dan telah diarsipkan oleh sistem. Anda dapat memfilter, mencari detail input dari admin, serta mengekspor data ke format Spreadsheet (Excel/Google Sheets).
                </p>
              </div>

              {/* CSV Export Button trigger */}
              <button
                onClick={() => {
                  const finishedOrdersList = orders.filter(o => o.is_archived);
                  // Apply active filters
                  const filteredList = finishedOrdersList.filter(o => {
                    // Search term filter
                    const searchLower = historySearch.toLowerCase();
                    const matchesSearch = 
                      o.id_order.toLowerCase().includes(searchLower) ||
                      (o.id_parent_order && o.id_parent_order.toLowerCase().includes(searchLower)) ||
                      o.nama_customer.toLowerCase().includes(searchLower) ||
                      o.nama_produk.toLowerCase().includes(searchLower) ||
                      (o.notes && o.notes.toLowerCase().includes(searchLower));

                    // Date range filter (input date string comparison)
                    let matchesDate = true;
                    if (historyStartDate) {
                      matchesDate = matchesDate && o.tanggal_input >= historyStartDate;
                    }
                    if (historyEndDate) {
                      matchesDate = matchesDate && o.tanggal_input <= (historyEndDate + 'T23:59:59');
                    }

                    // Booster filter
                    let matchesBooster = true;
                    if (historyBoosterFilter === 'booster') {
                      matchesBooster = o.is_booster;
                    } else if (historyBoosterFilter === 'normal') {
                      matchesBooster = !o.is_booster;
                    }

                    return matchesSearch && matchesDate && matchesBooster;
                  }).sort((a,b) => b.tanggal_input.localeCompare(a.tanggal_input));

                  if (filteredList.length === 0) {
                    alert('Tidak ada data rincian di tabel untuk diekspor!');
                    return;
                  }

                  // Handle CSV building and triggering client-side download
                  const headers = [
                    'ID Order',
                    'ID Transaksi Induk',
                    'Nama Customer',
                    'Nama Produk',
                    'Jumlah',
                    'Tanggal Pemesanan',
                    'Jatuh Tempo (Deadline)',
                    'Prioritas',
                    'Alur Divisi Estafet',
                    'Link Desain Grafik',
                    'Catatan Admin'
                  ];

                  const rows = filteredList.map(o => {
                    const alurStr = o.alur_divisi ? o.alur_divisi.join(' -> ') : '';
                    return [
                      o.id_order,
                      o.id_parent_order || '',
                      o.nama_customer,
                      o.nama_produk,
                      o.jumlah,
                      o.tanggal_input,
                      o.datetime_deadline,
                      o.is_booster ? 'BOOSTER (Skala Darurat)' : 'Reguler',
                      alurStr,
                      o.link_file_desain || '',
                      o.notes || ''
                    ];
                  });

                  const escapeCSV = (val: any) => {
                    const text = String(val === null || val === undefined ? '' : val);
                    const escaped = text.replace(/"/g, '""');
                    if (escaped.includes(',') || escaped.includes('\n') || escaped.includes('"')) {
                      return `"${escaped}"`;
                    }
                    return escaped;
                  };

                  const csvContent = [
                    headers.map(escapeCSV).join(','),
                    ...rows.map(row => row.map(escapeCSV).join(','))
                  ].join('\r\n');

                  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
                  const url = URL.createObjectURL(blob);
                  const link = document.createElement('a');
                  const nowStr = new Date().toISOString().split('T')[0];
                  
                  link.setAttribute('href', url);
                  link.setAttribute('download', `Ekspor_Arsip_Selesai_${nowStr}.csv`);
                  link.style.visibility = 'hidden';
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }}
                className="flex items-center gap-2 px-5 py-3 bg-emerald-600 hover:bg-emerald-550 active:bg-emerald-700 text-white font-bold rounded-2xl cursor-pointer text-xs font-mono tracking-wide uppercase transition-all shadow-md hover:shadow-emerald-900/10 focus:ring-2 focus:ring-emerald-500/20"
              >
                <Download className="h-4 w-4 shrink-0 text-emerald-100" />
                <span>Ekspor Spreadsheet (.CSV)</span>
              </button>
            </div>

            {/* Filter controls section */}
            <div className="bg-zinc-950 border border-zinc-900/60 p-5 rounded-3xl space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                
                {/* Search Bar filter */}
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider block">
                    Cari Detil Orderan (Nama / Produk / ID)
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
                    <input
                      type="text"
                      placeholder="Contoh: Jersey, CV Maju Jaya, ORD-..."
                      value={historySearch}
                      onChange={(e) => setHistorySearch(e.target.value)}
                      className="w-full bg-zinc-900/60 hover:bg-zinc-900/80 focus:bg-zinc-950 border border-zinc-850 hover:border-zinc-805 field-focus rounded-2xl py-2.5 pl-10 pr-4 text-xs text-zinc-200 placeholder-zinc-500 outline-none transition-all placeholder:text-zinc-600"
                    />
                  </div>
                </div>

                {/* Booster filter */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider block">
                    Prioritas (Tag Booster)
                  </label>
                  <select
                    value={historyBoosterFilter}
                    onChange={(e) => setHistoryBoosterFilter(e.target.value as any)}
                    className="w-full bg-zinc-900/60 hover:bg-zinc-900/80 focus:bg-zinc-950 border border-zinc-850 hover:border-zinc-805 rounded-2xl py-2.5 px-4.5 outline-none cursor-pointer text-xs text-zinc-300 transition-all font-sans"
                  >
                    <option value="all">Semua Prioritas</option>
                    <option value="booster">Hanya Booster / Urgen</option>
                    <option value="normal">Hanya Reguler</option>
                  </select>
                </div>

                {/* Reset Filters button */}
                <div className="flex items-end">
                  <button
                    onClick={() => {
                      setHistorySearch('');
                      setHistoryStartDate('');
                      setHistoryEndDate('');
                      setHistoryBoosterFilter('all');
                      setSelectedHistoryOrder(null);
                    }}
                    className="w-full py-2.5 bg-zinc-900 hover:bg-zinc-850 border border-zinc-850 hover:border-zinc-800 text-zinc-400 hover:text-zinc-200 text-xs font-mono font-bold rounded-2xl transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>Reset Filter</span>
                  </button>
                </div>

              </div>

              {/* Date pickers filter */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-zinc-900/40">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider block">
                    Batas Tanggal Mulai Pemesanan
                  </label>
                  <input
                    type="date"
                    value={historyStartDate}
                    onChange={(e) => setHistoryStartDate(e.target.value)}
                    className="w-full bg-zinc-900/60 hover:bg-zinc-900/80 focus:bg-zinc-950 border border-zinc-850 hover:border-zinc-800 text-xs text-zinc-300 rounded-2xl py-2 px-3.5 outline-none transition-all font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider block">
                    Batas Tanggal Akhir Pemesanan
                  </label>
                  <input
                    type="date"
                    value={historyEndDate}
                    onChange={(e) => setHistoryEndDate(e.target.value)}
                    className="w-full bg-zinc-900/60 hover:bg-zinc-900/80 focus:bg-zinc-950 border border-zinc-850 hover:border-zinc-800 text-xs text-zinc-300 rounded-2xl py-2 px-3.5 outline-none transition-all font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Rendered Stats for current filtered set */}
            {(() => {
              const finishedOrdersList = orders.filter(o => o.is_archived);
              const filteredList = finishedOrdersList.filter(o => {
                const searchLower = historySearch.toLowerCase();
                const matchesSearch = 
                  o.id_order.toLowerCase().includes(searchLower) ||
                  (o.id_parent_order && o.id_parent_order.toLowerCase().includes(searchLower)) ||
                  o.nama_customer.toLowerCase().includes(searchLower) ||
                  o.nama_produk.toLowerCase().includes(searchLower) ||
                  (o.notes && o.notes.toLowerCase().includes(searchLower));

                let matchesDate = true;
                if (historyStartDate) {
                  matchesDate = matchesDate && o.tanggal_input >= historyStartDate;
                }
                if (historyEndDate) {
                  matchesDate = matchesDate && o.tanggal_input <= (historyEndDate + 'T23:59:59');
                }

                let matchesBooster = true;
                if (historyBoosterFilter === 'booster') {
                  matchesBooster = o.is_booster;
                } else if (historyBoosterFilter === 'normal') {
                  matchesBooster = !o.is_booster;
                }

                return matchesSearch && matchesDate && matchesBooster;
              });

              const totalQty = filteredList.reduce((sum, current) => sum + (current.jumlah || 0), 0);
              const totalBooster = filteredList.filter(o => o.is_booster).length;

              return (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bento-card p-4 flex items-center gap-4 hover:border-zinc-800 transition-all">
                    <div className="h-10 w-10 shrink-0 rounded-2xl bg-zinc-90 w-10 h-10 bg-zinc-900 border border-zinc-850 text-emerald-400 flex items-center justify-center text-lg">
                      📦
                    </div>
                    <div>
                      <span className="block text-[9px] font-mono font-bold text-zinc-400 uppercase tracking-wider">Total Item Selesai</span>
                      <span className="text-xl font-display font-black text-white">{filteredList.length} <span className="text-xs text-zinc-400 font-normal">Orderan</span></span>
                    </div>
                  </div>
                  <div className="bento-card p-4 flex items-center gap-4 hover:border-zinc-800 transition-all">
                    <div className="h-10 w-10 shrink-0 rounded-2xl bg-zinc-90 w-10 h-10 bg-zinc-900 border border-zinc-850 text-sky-400 flex items-center justify-center text-lg">
                      📈
                    </div>
                    <div>
                      <span className="block text-[9px] font-mono font-bold text-zinc-400 uppercase tracking-wider">Akumulasi Qty Produk</span>
                      <span className="text-xl font-display font-black text-white">{totalQty} <span className="text-xs text-zinc-400 font-normal">Pcs / Lembar</span></span>
                    </div>
                  </div>
                  <div className="bento-card p-4 flex items-center gap-4 hover:border-zinc-800 transition-all">
                    <div className="h-10 w-10 shrink-0 rounded-2xl bg-zinc-90 w-10 h-10 bg-zinc-900 border border-zinc-850 text-amber-400 flex items-center justify-center text-lg">
                      ⚡
                    </div>
                    <div>
                      <span className="block text-[9px] font-mono font-bold text-zinc-400 uppercase tracking-wider">Antrean Booster Selesai</span>
                      <span className="text-xl font-display font-black text-white">{totalBooster} <span className="text-xs text-zinc-400 font-normal">Selesai</span></span>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* List / Table of Completed Orders */}
            <div className="bg-zinc-950 border border-zinc-900 rounded-3xl overflow-hidden shadow-xl">
              {(() => {
                const finishedOrdersList = orders.filter(o => o.is_archived);
                const filteredList = finishedOrdersList.filter(o => {
                  const searchLower = historySearch.toLowerCase();
                  const matchesSearch = 
                    o.id_order.toLowerCase().includes(searchLower) ||
                    (o.id_parent_order && o.id_parent_order.toLowerCase().includes(searchLower)) ||
                    o.nama_customer.toLowerCase().includes(searchLower) ||
                    o.nama_produk.toLowerCase().includes(searchLower) ||
                    (o.notes && o.notes.toLowerCase().includes(searchLower));

                  let matchesDate = true;
                  if (historyStartDate) {
                    matchesDate = matchesDate && o.tanggal_input >= historyStartDate;
                  }
                  if (historyEndDate) {
                    matchesDate = matchesDate && o.tanggal_input <= (historyEndDate + 'T23:59:59');
                  }

                  let matchesBooster = true;
                  if (historyBoosterFilter === 'booster') {
                    matchesBooster = o.is_booster;
                  } else if (historyBoosterFilter === 'normal') {
                    matchesBooster = !o.is_booster;
                  }

                  return matchesSearch && matchesDate && matchesBooster;
                }).sort((a,b) => b.tanggal_input.localeCompare(a.tanggal_input));

                if (filteredList.length === 0) {
                  return (
                    <div className="p-12 text-center space-y-4 animate-fade-in">
                      <div className="h-12 w-12 rounded-full bg-zinc-900 border border-zinc-850 flex items-center justify-center mx-auto text-zinc-500 text-xl">
                        📁
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-sm font-bold text-zinc-300 font-display">Arsip Masih Kosong / Filter Tidak Cocok</h4>
                        <p className="text-xs text-zinc-500 max-w-sm mx-auto leading-relaxed">
                          Tidak ditemukan data orderan selesai yang cocok dengan penyaringan rincian di atas. Periksa kembali filter pencarian Anda.
                        </p>
                      </div>
                    </div>
                  );
                }

                return (
                  <div className="overflow-x-auto scrollbar animate-fade-in">
                    <table className="w-full text-left text-xs border-collapse font-sans">
                      <thead>
                        <tr className="bg-zinc-900/80 border-b border-zinc-900 text-zinc-400 font-mono text-[10px] uppercase tracking-widerSelection select-none">
                          <th className="p-4 font-bold">Ref ID Pemesan</th>
                          <th className="p-4 font-bold">Nama Customer</th>
                          <th className="p-4 font-bold">Detail Pekerjaan</th>
                          <th className="p-4 font-bold">Alur Rute Sukses</th>
                          <th className="p-4 font-bold text-center">Tautan File</th>
                          <th className="p-4 font-bold text-right">Opsi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-900/60">
                        <AnimatePresence mode="popLayout" initial={false}>
                          {filteredList.map((o) => {
                            const alur = o.alur_divisi || [];
                            return (
                              <motion.tr 
                                layout
                                key={o.id_order}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.98 }}
                                transition={{ type: "spring", stiffness: 350, damping: 30 }}
                                className="hover:bg-zinc-900/30 transition-all group"
                              >
                                
                                {/* Order ID & Date */}
                                <td className="p-4 space-y-1 font-mono">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[11px] font-bold text-zinc-205 text-zinc-250 font-mono">
                                      {o.id_order}
                                    </span>
                                    {o.is_booster && (
                                      <span className="px-1.5 py-0.5 rounded bg-amber-950 border border-amber-850 text-[9px] text-amber-400 font-bold tracking-wider uppercase scale-90">
                                        Booster
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[10px] text-zinc-500 flex items-center gap-1">
                                    <Clock className="h-3 w-3 shrink-0" />
                                    <span>{new Date(o.tanggal_input).toLocaleDateString('id-ID', {day: 'numeric', month: 'short', year: 'numeric'})}</span>
                                  </div>
                                  {o.id_parent_order && (
                                    <div className="text-[9px] text-zinc-550 pt-0.5">
                                      Parent Induk: <strong className="font-semibold text-zinc-450">{o.id_parent_order}</strong>
                                    </div>
                                  )}
                                </td>

                                {/* Customer and quantity */}
                                <td className="p-4 space-y-1">
                                  <div className="font-bold text-zinc-200 text-xs truncate max-w-[150px]">
                                    {o.nama_customer}
                                  </div>
                                  <div className="text-[10px] text-zinc-500">
                                    Volume Qty: <strong className="text-zinc-320 text-zinc-300 font-mono font-semibold">{o.jumlah}</strong> Pcs
                                  </div>
                                </td>

                                {/* Product name & notes */}
                                <td className="p-4 space-y-1">
                                  <div className="text-zinc-200 font-bold max-w-[180px] break-words">
                                    {o.nama_produk}
                                  </div>
                                  {o.notes && (
                                    <p className="text-[10px] text-zinc-500 italic max-w-[180px] truncate hover:text-zinc-400 font-sans" title={o.notes}>
                                      "{o.notes}"
                                    </p>
                                  )}
                                </td>

                                {/* Route divisions completed */}
                                <td className="p-4">
                                  <div className="flex flex-wrap items-center gap-1 max-w-[280px]">
                                    {alur.map((div, idx) => (
                                      <React.Fragment key={idx}>
                                        <span className="px-1.5 py-0.5 bg-zinc-900 border border-emerald-900/35 text-[9px] text-emerald-400 rounded-md font-mono font-medium">
                                          {div}
                                        </span>
                                        {idx < alur.length - 1 && (
                                          <ArrowRight className="h-2.5 w-2.5 text-zinc-700 shrink-0" />
                                        )}
                                      </React.Fragment>
                                    ))}
                                    {alur.length === 0 && (
                                      <span className="text-zinc-650 italic text-[10px]">Alur terekam nihil</span>
                                    )}
                                  </div>
                                </td>

                                {/* Design Link */}
                                <td className="p-4 text-center">
                                  {o.link_file_desain ? (
                                    <a
                                      href={o.link_file_desain}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-300 hover:text-white rounded-lg transition-all text-[10px] font-mono cursor-pointer"
                                    >
                                      <span>Buka File</span>
                                      <Sparkles className="h-2.5 w-2.5 text-cyan-400 shrink-0" />
                                    </a>
                                  ) : (
                                    <span className="text-[10px] text-zinc-650 font-mono">Tanpa Desain</span>
                                  )}
                                </td>

                                {/* Detail Modal Action Button */}
                                <td className="p-4 text-right">
                                  <button
                                    onClick={() => setSelectedHistoryOrder(o)}
                                    className="px-3 py-1 bg-zinc-900 hover:bg-zinc-850 border border-zinc-850 hover:border-zinc-800 text-zinc-300 hover:text-white font-bold rounded-lg font-sans text-[10px] transition-all cursor-pointer inline-flex items-center gap-1 shadow-sm hover:shadow-md"
                                  >
                                    <span>Rincian</span>
                                  </button>
                                </td>

                              </motion.tr>
                            );
                          })}
                        </AnimatePresence>
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </div>

          </div>
        )}

      </main>

      {/* FOOTER METADATA */}
      <footer className="bg-zinc-950/80 border-t border-zinc-855 py-6 text-center text-xs text-zinc-450 shrink-0">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="font-sans">
            Sistem Manajemen Antrean Produksi Berantai - Dirancang untuk Blackpaint Group.
          </p>
          <div className="flex items-center gap-2 font-mono text-[10px] text-zinc-500">
            <span>Local Sync OK</span>
            <span className="h-1.5 w-1.5 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-zinc-800">|</span>
            <span>Platform: Flutter Dart + Web React Applet</span>
          </div>
        </div>
      </footer>

      {/* MODAL / DIALOG POPUP FOR KENDALA SELECTION */}
      {obstacleTargetOrderId && (
        <div className="fixed inset-0 bg-black/85 flex items-center justify-center p-4 z-[100] animate-fade-in backdrop-blur-md">
          <div className="bg-zinc-900 border border-zinc-850 rounded-3xl max-w-md w-full overflow-hidden p-6 shadow-3xl space-y-4">
            
            <div className="flex items-start gap-3">
              <div className="p-3 bg-red-950/80 border border-red-800/40 text-red-400 rounded-2xl shrink-0 animate-bounce">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-display font-medium text-white">
                  Laporkan Kendala Produksi
                </h3>
                <p className="text-xs text-zinc-400 mt-1.5 font-sans">
                  Pilih salah satu kendala di bawah. Selesai memencet mendaftarkan status kendala, alarm merah menyala akan merambat instan ke Dashboard Admin di kantor.
                </p>
              </div>
            </div>

            <div className="space-y-2 border-t border-b border-zinc-855 py-3">
              
              <button
                onClick={() => handleReportObstacle(obstacleTargetOrderId, 'Mesin Eror')}
                className="w-full text-left p-3 rounded-2xl bg-zinc-950 hover:bg-zinc-800/80 border border-zinc-850 hover:border-red-540 transition-all flex items-center gap-3 cursor-pointer group"
              >
                <div className="h-8 w-8 rounded-xl bg-red-500/10 text-red-400 flex items-center justify-center group-hover:scale-105 shrink-0 text-lg">
                  ⚙️
                </div>
                <div>
                  <span className="block text-xs font-bold text-zinc-200">Mesin Eror</span>
                  <span className="text-[10px] text-zinc-450 mt-0.5">Kerusakan fisik perangkat, cetakan terhambat mesin macet.</span>
                </div>
              </button>

              <button
                onClick={() => handleReportObstacle(obstacleTargetOrderId, 'Bahan Rusak')}
                className="w-full text-left p-3 rounded-2xl bg-zinc-955 hover:bg-zinc-800/80 border border-zinc-850 hover:border-red-540 transition-all flex items-center gap-3 cursor-pointer group"
              >
                <div className="h-8 w-8 rounded-xl bg-red-500/10 text-red-400 flex items-center justify-center group-hover:scale-105 shrink-0 text-lg">
                  📦
                </div>
                <div>
                  <span className="block text-xs font-bold text-zinc-200">Bahan Rusak</span>
                  <span className="text-[10px] text-zinc-455 mt-0.5">Bahan sobek, kehabisan stok kertas, atau cacat cetak media.</span>
                </div>
              </button>

              <button
                onClick={() => handleReportObstacle(obstacleTargetOrderId, 'File Corrupt')}
                className="w-full text-left p-3 rounded-2xl bg-zinc-950 hover:bg-zinc-800/80 border border-zinc-850 hover:border-red-540 transition-all flex items-center gap-3 cursor-pointer group"
              >
                <div className="h-8 w-8 rounded-xl bg-red-500/10 text-red-400 flex items-center justify-center group-hover:scale-105 shrink-0 text-lg">
                  📄
                </div>
                <div>
                  <span className="block text-xs font-bold text-zinc-200">File Corrupt</span>
                  <span className="text-[10px] text-zinc-455 mt-0.5">File desain hancur, tidak terbaca sistem RIP / cetakan.</span>
                </div>
              </button>

            </div>

            <div className="flex items-center justify-end gap-2 text-xs pt-1">
              <button
                onClick={() => setObstacleTargetOrderId(null)}
                className="px-4 py-2 bg-zinc-950 hover:bg-zinc-900 border border-zinc-850 hover:border-zinc-800 text-zinc-300 font-bold rounded-xl cursor-pointer transition-all font-mono text-[11px] uppercase tracking-wide"
              >
                Batal
              </button>
            </div>

          </div>
        </div>
      )}

      {/* CUSTOM CONFIRMATION MODAL */}
      {confirmConfig && (
        <div className="fixed inset-0 bg-black/85 flex items-center justify-center p-4 z-[100] animate-fade-in backdrop-blur-md">
          <div className="bg-zinc-900 border border-zinc-850 rounded-3xl max-w-md w-full overflow-hidden p-6 shadow-3xl space-y-4">
            
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-2xl shrink-0 ${
                confirmConfig.type === 'danger' 
                  ? 'bg-red-955/80 border border-red-800/40 text-red-400' 
                  : confirmConfig.type === 'warning'
                  ? 'bg-amber-955/80 border border-amber-800/40 text-amber-400'
                  : 'bg-teal-950/80 border border-teal-800/40 text-teal-400'
              }`}>
                {confirmConfig.type === 'danger' ? (
                  <AlertTriangle className="h-6 w-6" />
                ) : (
                  <Sliders className="h-6 w-6" />
                )}
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-display font-bold text-white">
                  {confirmConfig.title}
                </h3>
                <p className="text-xs text-zinc-450 leading-relaxed font-sans">
                  {confirmConfig.message}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 text-xs pt-3 border-t border-zinc-855">
              <button
                onClick={() => setConfirmConfig(null)}
                className="px-4 py-2.5 bg-zinc-950 hover:bg-zinc-900 border border-zinc-850 hover:border-zinc-800 text-zinc-400 hover:text-zinc-200 font-bold rounded-xl cursor-pointer transition-all font-mono text-[11px] uppercase tracking-wide"
              >
                {confirmConfig.cancelText || 'Batal'}
              </button>
              <button
                onClick={async () => {
                  const action = confirmConfig.onConfirm;
                  setConfirmConfig(null);
                  await action();
                }}
                className={`px-5 py-2.5 font-bold rounded-xl cursor-pointer transition-all font-mono text-[11px] uppercase tracking-wide border ${
                  confirmConfig.type === 'danger'
                    ? 'bg-red-650 hover:bg-red-600 border-red-700 hover:border-red-650 text-white shadow-lg shadow-red-950/45'
                    : 'bg-teal-650 hover:bg-teal-600 border-teal-700 hover:border-teal-650 text-white shadow-lg shadow-teal-950/45'
                }`}
              >
                {confirmConfig.confirmText || 'Konfirmasi'}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* AUTHENTICATION MODAL FOR SUPER ADMIN (OPERATIONAL) */}
      {authConfig && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-[110] animate-fade-in backdrop-blur-md">
          <div className="bg-zinc-900 border border-zinc-850 rounded-3xl max-w-sm w-full overflow-hidden p-6 shadow-3xl space-y-4 font-sans text-left">
            
            <div className="text-center space-y-2">
              <div className="mx-auto w-12 h-12 bg-teal-950/50 border border-teal-500/35 rounded-2xl flex items-center justify-center text-teal-400">
                <Lock className="w-5 h-5 animate-pulse" />
              </div>
              <h3 className="text-base font-display font-medium text-white">
                {authConfig.title}
              </h3>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                {authConfig.message}
              </p>
            </div>

            <form 
              onSubmit={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (authUsername.trim() === 'blackpaint' && authPassword === '102525Faypal') {
                  const action = authConfig.onSuccess;
                  setAuthConfig(null);
                  setAuthUsername('');
                  setAuthPassword('');
                  setAuthError('');
                  action();
                } else {
                  setAuthError('Username atau Password salah!');
                }
              }}
              className="space-y-3 pt-2"
            >
              <div>
                <label className="block text-[10px] text-zinc-500 uppercase tracking-widest mb-1.5 font-mono">Username</label>
                <input 
                  type="text"
                  autoFocus
                  required
                  value={authUsername}
                  onChange={(e) => {
                    setAuthUsername(e.target.value);
                    setAuthError('');
                  }}
                  placeholder="Masukkan username"
                  className="w-full bg-zinc-950 border border-zinc-850 focus:border-teal-500 rounded-xl px-3 py-2.5 text-xs text-white placeholder-zinc-600 outline-none transition"
                />
              </div>

              <div>
                <label className="block text-[10px] text-zinc-500 uppercase tracking-widest mb-1.5 font-mono">Password</label>
                <input 
                  type="password"
                  required
                  value={authPassword}
                  onChange={(e) => {
                    setAuthPassword(e.target.value);
                    setAuthError('');
                  }}
                  placeholder="Masukkan password"
                  className="w-full bg-zinc-950 border border-zinc-850 focus:border-teal-500 rounded-xl px-3 py-2.5 text-xs text-white placeholder-zinc-600 outline-none transition font-mono"
                />
              </div>

              {authError && (
                <p className="text-xs text-red-400 bg-red-950/45 border border-red-900/40 p-2 rounded-xl text-center font-semibold">
                  {authError}
                </p>
              )}

              <div className="flex items-center justify-end gap-2 text-xs pt-3 border-t border-zinc-850">
                <button
                  type="button"
                  onClick={() => {
                    if (authConfig.onCancel) {
                      authConfig.onCancel();
                    }
                    setAuthConfig(null);
                    setAuthUsername('');
                    setAuthPassword('');
                    setAuthError('');
                  }}
                  className="px-4 py-2.5 bg-zinc-950 hover:bg-zinc-900 border border-zinc-850 hover:border-zinc-800 text-zinc-400 hover:text-zinc-200 font-bold rounded-xl cursor-pointer transition-all font-mono text-[11px] uppercase tracking-wide"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-teal-650 hover:bg-teal-600 border border-teal-700 hover:border-teal-650 text-white font-bold rounded-xl cursor-pointer transition-all font-mono text-[11px] uppercase tracking-wide shadow-lg shadow-teal-950/45"
                >
                  Verifikasi
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* DETAIL MODAL FOR ARCHIVED HISTORICAL ORDERS */}
      {selectedHistoryOrder && (
        <div className="fixed inset-0 bg-black/85 flex items-center justify-center p-4 z-[100] animate-fade-in backdrop-blur-md">
          <div className="bg-zinc-900 border border-zinc-850 rounded-3xl max-w-xl w-full overflow-hidden p-6 shadow-3xl space-y-5">
            
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-3 border-b border-zinc-855">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-1.5 py-0.5 rounded-md bg-zinc-950 border border-zinc-800 text-[10.5px] text-zinc-400 font-mono font-bold uppercase pb-1">
                    Arsip Detail Rinci
                  </span>
                  {selectedHistoryOrder.is_booster && (
                    <span className="px-2 py-0.5 rounded bg-amber-955 border border-amber-800/65 text-[10px] text-amber-400 font-bold font-mono tracking-wide">
                      ⚡ BOOSTER
                    </span>
                  )}
                </div>
                <h3 className="text-base font-display font-bold text-white mt-1">
                  Pemesanan: {selectedHistoryOrder.id_order}
                </h3>
              </div>
              <button
                onClick={() => setSelectedHistoryOrder(null)}
                className="p-1 px-2.5 rounded-xl bg-zinc-950 hover:bg-zinc-800 border border-zinc-850 text-zinc-455 hover:text-zinc-200 text-xs font-mono font-bold cursor-pointer transition-all"
              >
                ✕
              </button>
            </div>

            {/* Modal Body Info Columns */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              
              <div className="space-y-1">
                <span className="text-[10px] font-mono font-bold text-zinc-500 uppercase block">Nama Customer</span>
                <span className="text-zinc-200 font-bold block bg-zinc-950 p-2.5 rounded-xl border border-zinc-900">{selectedHistoryOrder.nama_customer || '-'}</span>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-mono font-bold text-zinc-500 uppercase block">Spesifikasi Produk</span>
                <span className="text-zinc-200 font-bold block bg-zinc-950 p-2.5 rounded-xl border border-zinc-900">{selectedHistoryOrder.nama_produk || '-'}</span>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-mono font-bold text-zinc-500 uppercase block">Kapasitas Maksimal (Qty)</span>
                <span className="text-zinc-200 font-mono font-bold block bg-zinc-950 p-2.5 rounded-xl border border-zinc-900">{selectedHistoryOrder.jumlah} pcs / lembar</span>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-mono font-bold text-zinc-500 uppercase block">Tanggal Penulisan Tiket</span>
                <span className="text-zinc-300 font-mono block bg-zinc-950 p-2.5 rounded-xl border border-zinc-900">
                  {selectedHistoryOrder.tanggal_input ? new Date(selectedHistoryOrder.tanggal_input).toLocaleString('id-ID', {day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'}) : '-'}
                </span>
              </div>

              <div className="space-y-1 sm:col-span-2">
                <span className="text-[10px] font-mono font-bold text-zinc-500 uppercase block">Alur Rute Sukses Berantai</span>
                <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-900 flex flex-wrap items-center gap-1.5 font-sans">
                  {(selectedHistoryOrder.alur_divisi || []).map((div, idx, arr) => (
                    <React.Fragment key={idx}>
                      <span className="px-2 py-1 bg-zinc-900 text-emerald-400 text-xs rounded-lg font-mono border border-emerald-900/35">
                        {div}
                      </span>
                      {idx < arr.length - 1 && <ArrowRight className="h-3 w-3 text-zinc-600 shrink-0" />}
                    </React.Fragment>
                  ))}
                  {(selectedHistoryOrder.alur_divisi || []).length === 0 && (
                    <span className="text-zinc-600 italic">Tidak ada alur terekam</span>
                  )}
                </div>
              </div>

              {selectedHistoryOrder.link_file_desain && (
                <div className="space-y-1 sm:col-span-2">
                  <span className="text-[10px] font-mono font-bold text-zinc-500 uppercase block">Tautan Upload File Desain</span>
                  <div className="bg-zinc-950 p-2.5 rounded-xl border border-zinc-900 flex items-center justify-between gap-3 overflow-hidden">
                    <span className="text-zinc-450 truncate text-[11px] font-mono select-all shrink-0 max-w-[70%]">{selectedHistoryOrder.link_file_desain}</span>
                    <a
                      href={selectedHistoryOrder.link_file_desain}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1 bg-zinc-900 hover:bg-zinc-850 border border-zinc-805 text-[10.5px] text-cyan-400 font-bold rounded-lg shrink-0 transition-all cursor-pointer whitespace-nowrap"
                    >
                      Buka Desain →
                    </a>
                  </div>
                </div>
              )}

              <div className="space-y-1 sm:col-span-2">
                <span className="text-[10px] font-mono font-bold text-zinc-500 uppercase block">Catatan Tambahan Admin (Notes)</span>
                <p className="text-zinc-350 bg-zinc-950 p-3 rounded-xl border border-zinc-900 whitespace-pre-wrap leading-relaxed">
                  {selectedHistoryOrder.notes || 'Tidak ada catatan tambahan untuk pesanan ini.'}
                </p>
              </div>

            </div>

            {/* Modal Footer actions */}
            <div className="flex items-center justify-end gap-2 text-xs pt-3 border-t border-zinc-855">
              
              {/* Delete archived order? Let's check role validation. Only allow Admin or Operational */}
              {(userRole === 'Admin' || userRole === 'Operational') && (
                <button
                  onClick={() => {
                    const idToDelete = selectedHistoryOrder.id_order;
                    setConfirmConfig({
                      title: 'Hapus Rekaman Arsip Permanen',
                      message: `Apakah Anda yakin ingin menghapus arsip order "${idToDelete}" milik "${selectedHistoryOrder.nama_customer}" secara permanen dari database? Tindakan ini merusak statistik audit tahunan dan tidak dapat dikembalikan.`,
                      confirmText: 'Hapus Permanen',
                      type: 'danger',
                      onConfirm: async () => {
                        try {
                          await deleteDoc(doc(db, 'prod_queue_orders', idToDelete));
                          setSelectedHistoryOrder(null);
                        } catch (err) {
                          handleFirestoreError(err, OperationType.DELETE, `prod_queue_orders/${idToDelete}`);
                        }
                      }
                    });
                  }}
                  className="px-4 py-2.5 bg-red-955/65 hover:bg-red-950/80 border border-red-900/40 hover:border-red-800/80 text-red-400 font-bold rounded-xl cursor-pointer transition-all font-mono text-[10.5px] uppercase tracking-wider mr-auto"
                >
                  Hapus Arsip
                </button>
              )}

              <button
                onClick={() => setSelectedHistoryOrder(null)}
                className="px-5 py-2.5 bg-zinc-950 hover:bg-zinc-900 border border-zinc-850 hover:border-zinc-850 text-zinc-300 font-bold rounded-xl cursor-pointer transition-all font-mono text-[10.5px] uppercase tracking-wide"
              >
                Tutup
              </button>
            </div>

          </div>
        </div>
      )}

      {/* EDIT ORDER DIALOG POPUP */}
      {editingOrder && (
        <div className="fixed inset-0 bg-black/85 flex items-center justify-center p-4 z-[105] animate-fade-in backdrop-blur-md overflow-y-auto">
          <div className="bg-zinc-900 border border-zinc-850 rounded-3xl max-w-xl w-full overflow-hidden p-6 shadow-3xl space-y-4 my-8 relative">
            <div className="flex items-start justify-between border-b border-zinc-855 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-cyan-955/60 border border-cyan-800/40 text-cyan-400 rounded-xl">
                  <Edit2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-display font-semibold text-white">
                    Edit Data Orderan Secara Langsung
                  </h3>
                  <p className="text-xs text-zinc-400 font-sans mt-0.5">
                    ID Order: <span className="font-mono font-bold text-zinc-350">{editingOrder.id_order}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingOrder(null)}
                className="text-zinc-500 hover:text-zinc-300 p-1.5 rounded-lg hover:bg-zinc-950 transition cursor-pointer"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSaveEditOrder} className="space-y-4 font-sans text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Customer Name */}
                <div className="space-y-1 text-left">
                  <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Nama Customer *</label>
                  <input
                    type="text"
                    required
                    value={editingOrder.nama_customer || ''}
                    onChange={(e) => setEditingOrder({ ...editingOrder, nama_customer: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-850 rounded-xl px-3.5 py-2.5 text-zinc-200 focus:border-cyan-500 outline-none font-sans font-medium text-xs"
                    placeholder="Contoh: Budi Prasetyo"
                  />
                </div>

                {/* Product Name */}
                <div className="space-y-1 text-left">
                  <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider font-sans">Nama Produk / Jenis Cetakan *</label>
                  <select
                    value={editingOrder.nama_produk || ''}
                    onChange={(e) => {
                      const newProd = e.target.value;
                      const { route } = getProductRouteDetails(newProd);
                      setEditingOrder({
                        ...editingOrder,
                        nama_produk: newProd,
                        alur_divisi: route ? route.divisions : (editingOrder.alur_divisi || ['Cutting'])
                      });
                    }}
                    className="w-full bg-zinc-950 border border-zinc-850 rounded-xl px-3.5 py-2.5 text-cyan-400 font-bold focus:border-cyan-500 outline-none cursor-pointer text-xs"
                  >
                    {dynamicProductList.map(prod => (
                      <option key={prod} value={prod}>{prod}</option>
                    ))}
                  </select>
                </div>

                {/* Quantity */}
                <div className="space-y-1 text-left">
                  <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider font-sans font-medium">Jumlah Pesanan (Pcs) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={editingOrder.jumlah || ''}
                    onChange={(e) => setEditingOrder({ ...editingOrder, jumlah: Number(e.target.value) })}
                    className="w-full bg-zinc-950 border border-zinc-850 rounded-xl px-3.5 py-2.5 text-zinc-200 focus:border-cyan-500 outline-none font-mono text-xs font-bold"
                  />
                </div>

                {/* Admin Approver List */}
                <div className="space-y-1 text-left">
                  <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider font-sans">Nama Approve (Sales/Admin) *</label>
                  <select
                    value={editingOrder.nama_approve || ''}
                    onChange={(e) => setEditingOrder({ ...editingOrder, nama_approve: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-850 rounded-xl px-3.5 py-2.5 text-zinc-200 focus:border-cyan-500 outline-none cursor-pointer text-xs"
                  >
                    <option value="">-- Pilih Approver --</option>
                    {adminApprovers.map(appr => (
                      <option key={appr.id} value={appr.nama}>{appr.nama}</option>
                    ))}
                  </select>
                </div>

                {/* Design File Link */}
                <div className="space-y-1 md:col-span-2 text-left">
                  <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider font-sans">Link File Desain (Opsional)</label>
                  <input
                    type="text"
                    value={editingOrder.link_file_desain || ''}
                    onChange={(e) => setEditingOrder({ ...editingOrder, link_file_desain: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-850 rounded-xl px-3.5 py-2.5 text-cyan-450 focus:border-cyan-500 outline-none font-mono text-xs"
                    placeholder="Contoh: https://drive.google.com/..."
                  />
                </div>

                {/* Deadline Date & Time */}
                <div className="space-y-1 text-left">
                  <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider font-sans">Selesai Tanggal *</label>
                  <input
                    type="date"
                    required
                    value={editingOrder.datetime_deadline ? editingOrder.datetime_deadline.substring(0, 10) : ''}
                    onChange={(e) => {
                      const prevTime = editingOrder.datetime_deadline ? editingOrder.datetime_deadline.substring(11, 16) : '17:00';
                      const newDateTimeIso = new Date(`${e.target.value}T${prevTime}:00`).toISOString();
                      setEditingOrder({ ...editingOrder, datetime_deadline: newDateTimeIso });
                    }}
                    className="w-full bg-zinc-950 border border-zinc-850 rounded-xl px-3.5 py-2.5 text-zinc-200 focus:border-cyan-500 outline-none text-xs"
                  />
                </div>

                <div className="space-y-1 text-left">
                  <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider font-sans">Jam Batas Waktu *</label>
                  <input
                    type="time"
                    required
                    value={editingOrder.datetime_deadline ? editingOrder.datetime_deadline.substring(11, 16) : '17:00'}
                    onChange={(e) => {
                      const prevDate = editingOrder.datetime_deadline ? editingOrder.datetime_deadline.substring(0, 10) : new Date().toISOString().substring(0, 10);
                      const newDateTimeIso = new Date(`${prevDate}T${e.target.value}:00`).toISOString();
                      setEditingOrder({ ...editingOrder, datetime_deadline: newDateTimeIso });
                    }}
                    className="w-full bg-zinc-950 border border-zinc-850 rounded-xl px-3.5 py-2.5 text-zinc-200 focus:border-cyan-500 outline-none text-xs"
                  />
                </div>

                {/* Notes */}
                <div className="space-y-1 md:col-span-2 text-left">
                  <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider font-sans">Catatan Pengerjaan Cetakan</label>
                  <textarea
                    rows={2}
                    value={editingOrder.notes || ''}
                    onChange={(e) => setEditingOrder({ ...editingOrder, notes: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-850 rounded-xl px-3.5 py-2.5 text-zinc-300 focus:border-cyan-500 outline-none text-xs"
                    placeholder="Contoh: Finishing laminasi doff, packaging kayu, dll."
                  />
                </div>

                {/* ACC Operator */}
                <div className="space-y-1 text-left col-span-2">
                  <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider font-sans">ACC Operator (Opsional)</label>
                  <input
                    type="text"
                    value={editingOrder.acc_operator || ''}
                    onChange={(e) => setEditingOrder({ ...editingOrder, acc_operator: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-850 rounded-xl px-3.5 py-2 text-zinc-200 focus:border-cyan-500 outline-none text-xs"
                    placeholder="Contoh: Operator cutting"
                  />
                </div>

                {/* Booster urgent check */}
                <div className="flex items-center gap-3 md:col-span-2 bg-zinc-955/60 border border-zinc-850 p-4 rounded-xl mt-1 select-none text-left">
                  <input
                    type="checkbox"
                    id="edit-booster-toggle"
                    checked={!!editingOrder.is_booster}
                    onChange={(e) => setEditingOrder({ ...editingOrder, is_booster: e.target.checked })}
                    className="h-4 w-4 rounded bg-zinc-950 border-zinc-850 text-amber-500 focus:ring-amber-500/20"
                  />
                  <label htmlFor="edit-booster-toggle" className="font-sans font-bold text-zinc-300 cursor-pointer text-xs">
                    🚀 CHECKBOX BOOSTER (SUPER URGENT)
                    <span className="block text-[10px] text-zinc-500 font-normal mt-0.5">Re-prioritaskan antrean ini agar otomatis melongok paling atas.</span>
                  </label>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-3 border-t border-zinc-855 mt-4 justify-end">
                <button
                  type="button"
                  onClick={() => setEditingOrder(null)}
                  className="px-5 py-2.5 bg-zinc-950 hover:bg-zinc-900 border border-zinc-850 text-zinc-400 font-bold rounded-xl cursor-pointer transition-all font-mono text-[10.5px] uppercase tracking-wide"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-555 hover:to-teal-555 text-white font-bold rounded-xl cursor-pointer transition-all font-mono text-[10.5px] uppercase tracking-wider shadow-lg hover:shadow-cyan-500/10 flex items-center gap-1.5"
                >
                  <Save className="h-4 w-4 shrink-0" />
                  <span>Simpan Perubahan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2-STEP VERIFICATION MODAL FOR PENDING STATUS */}
      {pendingVerificationOrder && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-[115] animate-fade-in backdrop-blur-md">
          <div className="bg-zinc-900 border border-zinc-850 rounded-3xl max-w-sm w-full overflow-hidden p-6 shadow-3xl space-y-4 font-sans text-left">
            
            {/* Header progress indication */}
            <div className="flex items-center justify-between border-b border-zinc-855 pb-2.5">
              <span className="text-[10px] font-mono font-bold text-amber-500 uppercase tracking-widest">
                VERIFIKASI 2 LANGKAH
              </span>
              <span className="text-[10px] font-mono font-bold text-zinc-500">
                LANGKAH {pendingVerificationStep} DARI 2
              </span>
            </div>

            {pendingVerificationStep === 1 ? (
              /* STEP 1: IMPACT CONFIRMATION */
              <div className="space-y-4">
                <div className="text-center space-y-2">
                  <div className="mx-auto w-12 h-12 bg-amber-955/50 border border-amber-500/35 rounded-2xl flex items-center justify-center text-amber-500 shadow-lg shadow-amber-500/5">
                    <Pause className="w-5 h-5 animate-pulse" />
                  </div>
                  <h3 className="text-base font-display font-semibold text-white">
                    Konfirmasi Penangguhan Orderan
                  </h3>
                  <div className="bg-zinc-950/85 border border-zinc-900/60 p-3 rounded-xl text-center space-y-1">
                    <p className="text-[10px] font-mono text-zinc-500">ID ORDER:</p>
                    <p className="text-xs font-mono font-bold text-amber-450">{pendingVerificationOrder.id_order}</p>
                    <p className="text-[10px] font-mono text-zinc-500 mt-2">NAMA CUSTOMER:</p>
                    <p className="text-xs font-sans font-extrabold text-zinc-200">{pendingVerificationOrder.nama_customer}</p>
                  </div>
                </div>

                <div className="bg-red-955/25 border border-red-900/30 p-3.5 rounded-xl text-[11px] text-red-200 leading-relaxed text-center font-medium">
                  ⚠️ <span className="font-bold underline text-red-350">Dampak Penangguhan:</span> Order ini akan dibekukan sepenuhnya di semua workstation. Operator tidak akan dapat melanjutkan pekerjaan ini sampai penangguhan dibuka kembali oleh Admin.
                </div>

                <div className="flex items-center gap-2.5 pt-2 border-t border-zinc-855 justify-end">
                  <button
                    type="button"
                    onClick={() => setPendingVerificationOrder(null)}
                    className="flex-1 py-2.5 bg-zinc-950 hover:bg-zinc-900 border border-zinc-850 text-zinc-400 font-bold rounded-xl cursor-pointer transition-all font-mono text-[10.5px] uppercase tracking-wide text-center"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={() => setPendingVerificationStep(2)}
                    className="flex-1 py-2.5 bg-gradient-to-r from-amber-600 to-amber-555 hover:from-amber-555 hover:to-amber-500 text-white font-bold rounded-xl cursor-pointer transition-all font-mono text-[10.5px] uppercase tracking-wider text-center shadow-lg hover:shadow-amber-500/10"
                  >
                    Lanjut (Step 2) ➔
                  </button>
                </div>
              </div>
            ) : (
              /* STEP 2: DOUBLE-CONFIRMATION (SANS SANDI) */
              <div className="space-y-4">
                <div className="text-center space-y-2">
                  <div className="mx-auto w-12 h-12 bg-red-955/50 border border-red-500/35 rounded-2xl flex items-center justify-center text-red-405 shadow-lg shadow-red-500/5">
                    <AlertTriangle className="w-5 h-5 animate-bounce text-amber-500" />
                  </div>
                  <h3 className="text-base font-display font-semibold text-white">
                    Verifikasi Tahap Akhir
                  </h3>
                  <p className="text-[11px] text-zinc-400 text-center">
                    Apakah Anda benar-benar yakin ingin menangguhkan orderan ini? Pengerjaan di workstation akan segera dihentikan secara real-time.
                  </p>
                </div>

                <div className="bg-zinc-950 border border-zinc-850/80 p-3 rounded-xl space-y-1.5 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-zinc-500">ID Order:</span>
                    <span className="font-mono font-bold text-zinc-350">{pendingVerificationOrder.id_order}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Nama Customer:</span>
                    <span className="font-bold text-zinc-300">{pendingVerificationOrder.nama_customer}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Jenis Cetakan:</span>
                    <span className="font-semibold text-cyan-400">{pendingVerificationOrder.nama_produk}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 pt-3 border-t border-zinc-855 mt-4 font-sans">
                  <button
                    type="button"
                    onClick={() => setPendingVerificationStep(1)}
                    className="flex-1 py-2.5 bg-zinc-950 hover:bg-zinc-900 border border-zinc-850 text-zinc-400 font-bold rounded-xl cursor-pointer transition-all font-mono text-[10.5px] uppercase tracking-wide text-center"
                  >
                    ⬅ Kembali
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExecutePendingActivation(pendingVerificationOrder)}
                    className="flex-1 py-2.5 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-555 hover:to-amber-555 text-white font-bold rounded-xl cursor-pointer transition-all font-mono text-[10.5px] uppercase tracking-wider text-center shadow-lg"
                  >
                    Setuju, Pending! 🔒
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* REAL-TIME SLIDE NOTIFICATIONS (TOASTS) BOTTOM RIGHT */}
      <div className="fixed bottom-6 right-6 z-[120] flex flex-col gap-3 pointer-events-none max-w-sm w-full font-sans">
        <AnimatePresence>
          {notifications.map((notif) => (
            <motion.div
              key={notif.id}
              initial={{ opacity: 0, x: 100, y: 0, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 120, scale: 0.95, transition: { duration: 0.25 } }}
              transition={{ type: 'spring', damping: 20, stiffness: 220 }}
              className="pointer-events-auto w-full bg-[#0d0d11]/95 border border-emerald-950/70 shadow-2xl rounded-2xl overflow-hidden p-4 flex flex-col gap-2 backdrop-blur-xl relative"
              style={{
                boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.7), inset 0 1px 1px 0 rgba(255, 255, 255, 0.05), 0 0 16px -2px rgba(16, 185, 129, 0.15)'
              }}
            >
              {/* Highlight ribbon indicator based on priority */}
              <div className={`absolute top-0 left-0 bottom-0 w-1.5 ${notif.isBooster ? 'bg-gradient-to-b from-amber-500 to-red-500' : 'bg-gradient-to-b from-emerald-500 to-teal-500'}`} />

              <div className="flex items-start justify-between pl-2">
                <div className="flex items-center gap-2.5">
                  <div className={`p-1.5 rounded-lg ${notif.isBooster ? 'bg-amber-955 border border-amber-800/65 text-amber-400' : 'bg-emerald-955 border border-emerald-800/65 text-emerald-450'}`}>
                    <CheckCircle2 className="h-4 w-4 animate-bounce" />
                  </div>
                  <div>
                    <h4 className="text-[12.5px] font-bold text-white tracking-wide">
                      Order Berhasil Dikirim!
                    </h4>
                    <p className="text-[10px] text-zinc-400 font-medium">
                      Telah ditambahkan ke dalam antrean produksi.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setNotifications(prev => prev.filter(n => n.id !== notif.id))}
                  className="text-zinc-500 hover:text-zinc-300 p-1 rounded-lg hover:bg-zinc-900/65 transition cursor-pointer select-none"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Order Info Panel */}
              <div className="bg-[#121217]/85 rounded-xl p-3 pl-3.5 border border-zinc-900/80 text-[11px] space-y-1.5 font-sans ml-2">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">ID Order:</span>
                  <span className="font-mono font-bold text-white tracking-wider bg-zinc-950/90 border border-zinc-850 px-2 py-0.5 rounded text-[10.5px]">
                    {notif.orderId}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Nama Customer:</span>
                  <span className="font-bold text-zinc-200 truncate max-w-[170px]">{notif.custName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Rincian:</span>
                  <span className="font-semibold text-zinc-300">
                    {notif.itemsCount} Jenis Cetakan
                  </span>
                </div>
              </div>

              {/* Bottom bar */}
              <div className="flex items-center justify-between text-[9px] font-mono text-zinc-550 pl-2">
                <span className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 bg-emerald-500 rounded-full animate-pulse" />
                  <span>SINKRONISASI AKTIF</span>
                </span>
                <span>{notif.timestamp}</span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

    </div>
  );
}
