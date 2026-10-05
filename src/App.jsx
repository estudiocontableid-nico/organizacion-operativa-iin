import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Moon, Sun, Info, X, ChevronDown, Check, FilterX, Calendar, ArrowLeft, 
  Trash2, Plus, Download, RefreshCw, Layers
} from 'lucide-react';
import { 
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, 
  Tooltip as RechartsTooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import configData from './config.json';
import './index.css';

const COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', 
  '#8b5cf6', '#ec4899', '#06b6d4', '#f97316', 
  '#14b8a6', '#6366f1', '#84cc16', '#a855f7'
];

// Helper seguro para obtener propiedades sin importar mayúsculas/minúsculas o espacios
const getProp = (obj, key) => {
  if (!obj) return '';
  if (obj[key] !== undefined && obj[key] !== null) return obj[key];
  const targetKey = key.toLowerCase().trim();
  const match = Object.keys(obj).find(k => k.toLowerCase().trim() === targetKey);
  return match ? obj[match] : '';
};

const normalizeText = (text) => {
  if (text === null || text === undefined) return '';
  return String(text).toLowerCase().trim();
};

const parseDayRanges = (val) => {
  if (!val) return [];
  const parts = String(val).split(';').map(p => p.trim()).filter(Boolean);
  const nums = [];
  parts.forEach(p => {
    const n = parseInt(p, 10);
    if (!isNaN(n)) nums.push(n);
  });
  return nums;
};

// Parser robusto de CSV respetando comillas y saltos de línea internos
const parseCSV = (csvText) => {
  const rows = [];
  let currentRow = [];
  let currentVal = '';
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentVal += '"';
        i++; // saltar comilla escapada
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      currentRow.push(currentVal.trim());
      currentVal = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') i++;
      currentRow.push(currentVal.trim());
      if (currentRow.some(c => c.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentVal = '';
    } else {
      currentVal += char;
    }
  }
  if (currentVal || currentRow.length > 0) {
    currentRow.push(currentVal.trim());
    if (currentRow.some(c => c.length > 0)) {
      rows.push(currentRow);
    }
  }

  if (rows.length < 2) return [];

  const headers = rows[0].map(h => h.replace(/^["']|["']$/g, '').trim());
  const data = [];

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const item = {};
    headers.forEach((header, colIdx) => {
      item[header] = row[colIdx] ? row[colIdx].replace(/^["']|["']$/g, '') : '';
    });
    data.push(item);
  }
  return data;
};

// Componente MultiSelect con Búsqueda
const MultiSelect = ({ label, options, selected, onChange, isTable = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!isOpen) setSearchTerm('');
  }, [isOpen]);

  const toggleOption = (option) => {
    if (selected.includes(option)) {
      onChange(selected.filter(item => item !== option));
    } else {
      onChange([...selected, option]);
    }
  };

  const selectAll = () => onChange([...options]);
  const clearAll = () => onChange([]);

  return (
    <div className={isTable ? "table-filter-group" : "filter-group"} ref={dropdownRef}>
      {label && <label>{label}</label>}
      <div className="custom-select-wrapper">
        <button 
          type="button"
          className={isTable ? "table-custom-select-btn" : "custom-select-btn"} 
          onClick={() => setIsOpen(!isOpen)}
        >
          <span className="truncate">
            {selected.length === 0 ? 'Sin selección' : 
             selected.length === 1 ? selected[0] : 
             selected.length === options.length ? 'Todos' :
             `${selected.length} selecc.`}
          </span>
          <ChevronDown size={isTable ? 12 : 16} style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0)', transition: '0.2s' }}/>
        </button>
        
        <AnimatePresence>
          {isOpen && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="custom-select-dropdown"
              style={isTable ? { minWidth: '100%', width: 'max-content', maxWidth: '300px', right: 0, left: 'auto' } : {}}
            >
              <div className="dropdown-search">
                <input 
                  type="text" 
                  placeholder="Buscar..." 
                  value={searchTerm} 
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
              <div className="dropdown-actions">
                <button type="button" onClick={selectAll}>Todos</button>
                <button type="button" onClick={clearAll}>Limpiar</button>
              </div>
              <div className="dropdown-options">
                {options.filter(opt => String(opt).toLowerCase().includes(searchTerm.toLowerCase())).map(opt => (
                  <label key={opt} className="dropdown-option" onClick={(e) => { e.preventDefault(); toggleOption(opt); }}>
                    <div className={`checkbox ${selected.includes(opt) ? 'checked' : ''}`}>
                      {selected.includes(opt) && <Check size={12} color="white" />}
                    </div>
                    <span>{opt}</span>
                  </label>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default function App() {
  const [theme, setTheme] = useState('dark');
  const [rawData, setRawData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dataSourceUsed, setDataSourceUsed] = useState('');
  
  // Vistas
  const [currentPage, setCurrentPage] = useState('dashboard'); // 'dashboard' | 'gantt'
  const [viewMode, setViewMode] = useState('table'); // 'table', 'pie', 'bar'
  const [isScrolled, setIsScrolled] = useState(false);
  const [modalContent, setModalContent] = useState(null);

  // Ordenamiento
  const [sortColumn, setSortColumn] = useState('Area');
  const [sortDirection, setSortDirection] = useState('asc');

  // Filtros
  const [filterDiaDesde, setFilterDiaDesde] = useState('');
  const [filterDiaHasta, setFilterDiaHasta] = useState('');
  const [filters, setFilters] = useState({
    Area: [],
    'Responsable Principal': [],
    'Período del Mes': []
  });

  // Edición
  const [isEditing, setIsEditing] = useState(false);
  const [editableData, setEditableData] = useState([]);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  
  // Modal Agregar Nueva Tarea
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newTask, setNewTask] = useState({
    'Período del Mes': 'Todo el mes. Diariamente o según ocurrencia',
    'Responsable Principal': 'Asistente',
    'Tareas Críticas de Carga y Control': '',
    'Entregable': '',
    'Desde': '1',
    'Hasta': '31',
    'Area': 'Contabilidad'
  });

  // Carga inicial de datos
  const loadInitialData = async () => {
    setIsLoading(true);
    let loaded = false;

    // 1. Probar carga desde CSV en internet o public
    const csvUrl = configData.dataSource?.csvUrl || '/Calendario_Operativo.csv';
    try {
      const res = await fetch(csvUrl, { cache: 'no-cache' });
      if (res.ok) {
        const text = await res.text();
        const parsed = parseCSV(text);
        if (parsed && parsed.length > 0) {
          const formatted = parsed.map((item, idx) => ({
            ...item,
            id_key: item.id_key || `task-${idx + 1}`
          }));
          setRawData(formatted);
          setEditableData(formatted);
          setDataSourceUsed(`CSV Online (${csvUrl})`);
          loaded = true;
        }
      }
    } catch (err) {
      console.warn("Fallo carga de CSV, probando fallback JSON...", err);
    }

    // 2. Si falló el CSV, cargar fallback JSON
    if (!loaded) {
      const jsonUrl = configData.dataSource?.jsonFallback || '/data.json';
      try {
        const res = await fetch(jsonUrl, { cache: 'no-cache' });
        if (res.ok) {
          const json = await res.json();
          const formatted = json.map((item, idx) => ({
            ...item,
            id_key: item.id_key || `task-${idx + 1}`
          }));
          setRawData(formatted);
          setEditableData(formatted);
          setDataSourceUsed(`JSON Local (${jsonUrl})`);
          loaded = true;
        }
      } catch (err) {
        console.error("Fallo carga de JSON", err);
      }
    }
    setIsLoading(false);
  };

  useEffect(() => {
    document.title = configData.titletag.title;
    document.documentElement.setAttribute('data-theme', theme);

    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);

    loadInitialData();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
  };

  // Opciones únicas para filtros
  const filterOptions = useMemo(() => {
    const source = isEditing ? editableData : rawData;
    const areas = [...new Set(source.map(d => getProp(d, 'Area')).filter(Boolean))].sort();
    const resp = [...new Set(source.map(d => getProp(d, 'Responsable Principal')).filter(Boolean))].sort();
    const pers = [...new Set(source.map(d => getProp(d, 'Período del Mes')).filter(Boolean))].sort();
    return {
      Area: areas,
      'Responsable Principal': resp,
      'Período del Mes': pers
    };
  }, [rawData, editableData, isEditing]);

  const clearAllFilters = () => {
    setFilters({
      Area: [],
      'Responsable Principal': [],
      'Período del Mes': []
    });
    setFilterDiaDesde('');
    setFilterDiaHasta('');
    setSortColumn('Area');
    setSortDirection('asc');
  };

  const handleFilterChange = (key, valArray) => {
    setFilters(prev => ({ ...prev, [key]: valArray }));
  };

  // Filtrado y Ordenamiento
  const filteredData = useMemo(() => {
    const source = isEditing ? editableData : rawData;

    const filtered = source.filter(item => {
      // Filtros de categorías
      const matchCat = Object.entries(filters).every(([key, values]) => {
        if (!values || values.length === 0) return true;
        const itemVal = normalizeText(getProp(item, key));
        return values.some(v => normalizeText(v) === itemVal);
      });
      if (!matchCat) return false;

      // Filtro de Días (Desde / Hasta)
      const desdeList = parseDayRanges(getProp(item, 'Desde'));
      const hastaList = parseDayRanges(getProp(item, 'Hasta'));
      const minTaskDay = desdeList.length > 0 ? Math.min(...desdeList) : 1;
      const maxTaskDay = hastaList.length > 0 ? Math.max(...hastaList) : 31;

      if (filterDiaDesde !== '') {
        const fd = parseInt(filterDiaDesde, 10);
        if (!isNaN(fd) && maxTaskDay < fd) return false;
      }
      if (filterDiaHasta !== '') {
        const fh = parseInt(filterDiaHasta, 10);
        if (!isNaN(fh) && minTaskDay > fh) return false;
      }

      return true;
    });

    return filtered.sort((a, b) => {
      if (!sortColumn) return 0;
      const valA = String(getProp(a, sortColumn) || '').toLowerCase();
      const valB = String(getProp(b, sortColumn) || '').toLowerCase();
      const cmp = valA.localeCompare(valB, undefined, { numeric: true });
      return sortDirection === 'asc' ? cmp : -cmp;
    });
  }, [rawData, editableData, isEditing, filters, filterDiaDesde, filterDiaHasta, sortColumn, sortDirection]);

  const handleHeaderClick = (columnName) => {
    if (sortColumn !== columnName) {
      setSortColumn(columnName);
      setSortDirection('asc');
    } else if (sortDirection === 'asc') {
      setSortDirection('desc');
    } else {
      setSortColumn(null);
      setSortDirection('asc');
    }
  };

  // KPIs / Estadísticas por Responsable
  const statsByResponsible = useMemo(() => {
    const counts = {};
    filteredData.forEach(d => {
      const resp = getProp(d, 'Responsable Principal') || 'Sin asignar';
      counts[resp] = (counts[resp] || 0) + 1;
    });
    const total = filteredData.length;
    return Object.entries(counts).map(([name, count]) => ({
      name,
      count,
      percentage: total > 0 ? Number(((count / total) * 100).toFixed(1)) : 0
    })).sort((a, b) => b.count - a.count);
  }, [filteredData]);

  // Manejo de Edición, Agregar y Eliminar
  const handlePiClick = () => {
    if (isEditing) {
      setIsEditing(false);
    } else {
      setIsAuthModalOpen(true);
      setPasswordInput('');
    }
  };

  const handleAuthSubmit = (e) => {
    e.preventDefault();
    if (passwordInput === '07609' || passwordInput === '0760') {
      setIsEditing(true);
      setIsAuthModalOpen(false);
    } else {
      alert('Contraseña incorrecta');
      setPasswordInput('');
    }
  };

  const handleCellChange = (id_key, field, value) => {
    setEditableData(prev => prev.map(item => 
      item.id_key === id_key ? { ...item, [field]: value } : item
    ));
  };

  const handleDeleteTask = (id_key) => {
    if (window.confirm('¿Seguro que deseas eliminar esta tarea del calendario operativo?')) {
      setEditableData(prev => prev.filter(item => item.id_key !== id_key));
    }
  };

  const handleAddTaskSubmit = (e) => {
    e.preventDefault();
    if (!newTask['Tareas Críticas de Carga y Control']) {
      alert('Por favor describe la tarea crítica.');
      return;
    }
    const newEntry = {
      ...newTask,
      id_key: `task-${Date.now()}`
    };
    setEditableData(prev => [newEntry, ...prev]);
    setIsAddModalOpen(false);
    setNewTask({
      'Período del Mes': 'Todo el mes. Diariamente o según ocurrencia',
      'Responsable Principal': 'Asistente',
      'Tareas Críticas de Carga y Control': '',
      'Entregable': '',
      'Desde': '1',
      'Hasta': '31',
      'Area': 'Contabilidad'
    });
  };

  const handleSaveAll = () => {
    setRawData(editableData);
    setIsEditing(false);
    alert('Cambios guardados en la memoria activa del tablero.');
  };

  const exportCurrentToCSV = () => {
    const source = isEditing ? editableData : rawData;
    const headers = [
      "Período del Mes", "Responsable Principal", 
      "Tareas Críticas de Carga y Control", "Entregable", 
      "Desde", "Hasta", "Area"
    ];
    let csvContent = "\uFEFF" + headers.map(h => `"${h}"`).join(",") + "\n";
    source.forEach(item => {
      const row = headers.map(h => `"${String(getProp(item, h) || '').replace(/"/g, '""')}"`);
      csvContent += row.join(",") + "\n";
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "Calendario_Operativo_Actualizado.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isLoading) {
    return (
      <div className="app-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          style={{ width: '40px', height: '40px', border: '4px solid var(--border-color)', borderTopColor: 'var(--primary-color)', borderRadius: '50%' }}
        />
        <span style={{ marginLeft: '1rem', fontWeight: 600 }}>Cargando Calendario Operativo de IIN...</span>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Encabezado */}
      <header className={`header ${isScrolled ? 'scrolled' : ''}`}>
        <div className="logo-space">
          <img 
            src={theme === 'dark' ? configData.header.logoDarkModeUrl : configData.header.logoLightModeUrl} 
            alt="Logo IIN" 
            className="header-logo"
          />
          <div className="header-titles">
            <h1 className="title-line-1">{configData.header.titleLine1}</h1>
            <h2 className="title-line-2">{configData.header.titleLine2}</h2>
            <h3 className="title-line-3">{configData.header.titleLine3}</h3>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button 
            type="button"
            className="toggle-btn"
            onClick={exportCurrentToCSV}
            title="Descargar base CSV actualizada"
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}
          >
            <Download size={16} /> CSV
          </button>

          {currentPage === 'dashboard' ? (
            <button 
              onClick={() => setCurrentPage('gantt')}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', borderRadius: '0.5rem', backgroundColor: 'var(--primary-color)', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 600 }}
            >
              <Calendar size={18} /> Ver Gantt
            </button>
          ) : (
            <button 
              onClick={() => setCurrentPage('dashboard')}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', borderRadius: '0.5rem', backgroundColor: 'transparent', color: 'var(--text-color)', border: '1px solid var(--border-color)', cursor: 'pointer', fontWeight: 600 }}
            >
              <ArrowLeft size={18} /> Volver a Tareas
            </button>
          )}

          <button className="theme-toggle" onClick={toggleTheme} title="Cambiar Tema">
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          </button>
        </div>
      </header>

      {/* Contenido Principal */}
      <main className="main-content">
        
        {/* Panel de Filtros */}
        <div className="dashboard-section" style={{ position: 'relative', zIndex: 10 }}>
          <div className="section-header" style={{ marginBottom: '1rem' }}>
            <div className="section-title">Segmentación del Calendario</div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {isEditing && (
                <button 
                  className="toggle-btn" 
                  onClick={() => setIsAddModalOpen(true)}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', backgroundColor: 'var(--accent-color)', color: 'white' }}
                >
                  <Plus size={16}/> Nueva Tarea
                </button>
              )}
              <button className="toggle-btn" onClick={clearAllFilters} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FilterX size={16}/> Limpiar Filtros
              </button>
            </div>
          </div>

          <div className="filters-panel">
            <MultiSelect 
              label="Área Operativa"
              options={filterOptions.Area}
              selected={filters.Area}
              onChange={(s) => handleFilterChange('Area', s)}
            />
            <MultiSelect 
              label="Responsable Principal"
              options={filterOptions['Responsable Principal']}
              selected={filters['Responsable Principal']}
              onChange={(s) => handleFilterChange('Responsable Principal', s)}
            />
            <MultiSelect 
              label="Período del Mes"
              options={filterOptions['Período del Mes']}
              selected={filters['Período del Mes']}
              onChange={(s) => handleFilterChange('Período del Mes', s)}
            />

            <div className="filter-group">
              <label>Día Desde (1 - 31)</label>
              <input 
                type="number"
                min="1"
                max="31"
                placeholder="Día desde"
                className="edit-input"
                style={{ padding: '0.47rem 0.75rem', borderRadius: '0.375rem', width: '100%', height: '38px', boxSizing: 'border-box' }}
                value={filterDiaDesde}
                onChange={(e) => setFilterDiaDesde(e.target.value)}
              />
            </div>
            <div className="filter-group">
              <label>Día Hasta (1 - 31)</label>
              <input 
                type="number"
                min="1"
                max="31"
                placeholder="Día hasta"
                className="edit-input"
                style={{ padding: '0.47rem 0.75rem', borderRadius: '0.375rem', width: '100%', height: '38px', boxSizing: 'border-box' }}
                value={filterDiaHasta}
                onChange={(e) => setFilterDiaHasta(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Vista: Dashboard (Tabla o Gráficos) */}
        {currentPage === 'dashboard' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            
            {/* KPI Cards por Responsable (Oculto temporalmente a pedido pero conservado en el código) */}
            {false && (
              <div className="kpi-container">
                <AnimatePresence>
                  {statsByResponsible.map(({ name, count, percentage }) => (
                    <motion.div 
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      key={name} 
                      className="kpi-card"
                    >
                      <div className="kpi-title">{name}</div>
                      <div className="kpi-value">{count} <span style={{ fontSize: '0.9rem', opacity: 0.7 }}>tareas ({percentage}%)</span></div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}

            {/* Tabla de Tareas */}
            <div className="dashboard-section" style={{ zIndex: 1 }}>
              <div className="section-header">
                <div className="section-title">
                  Tareas Críticas ({filteredData.length} registros)
                  {isEditing && <span style={{ color: 'var(--primary-color)', marginLeft: '1rem', fontSize: '0.9rem' }}>● Modo Edición Activo</span>}
                </div>
                {/* Vistas alternativas (Ocultas temporalmente a pedido, conservadas en código) */}
                {false && (
                  <div className="view-toggles">
                    <button className={`toggle-btn ${viewMode === 'table' ? 'active' : ''}`} onClick={() => setViewMode('table')}>Tabla</button>
                    <button className={`toggle-btn ${viewMode === 'pie' ? 'active' : ''}`} onClick={() => setViewMode('pie')}>Torta</button>
                    <button className={`toggle-btn ${viewMode === 'bar' ? 'active' : ''}`} onClick={() => setViewMode('bar')}>Barras</button>
                  </div>
                )}
              </div>

              <div style={{ minHeight: '400px' }}>
                {viewMode === 'table' && (
                  <div style={{ overflowX: 'auto' }}>
                    <table>
                      <thead>
                        <tr>
                          {isEditing && <th style={{ width: '50px', textAlign: 'center' }}>Acción</th>}
                          <th onClick={() => handleHeaderClick('Area')} style={{ cursor: 'pointer', userSelect: 'none', width: '22%' }}>
                            Área {sortColumn === 'Area' && (sortDirection === 'asc' ? '▲' : '▼')}
                          </th>
                          <th onClick={() => handleHeaderClick('Período del Mes')} style={{ cursor: 'pointer', userSelect: 'none', width: '28%' }}>
                            Período {sortColumn === 'Período del Mes' && (sortDirection === 'asc' ? '▲' : '▼')}
                          </th>
                          <th onClick={() => handleHeaderClick('Responsable Principal')} style={{ cursor: 'pointer', userSelect: 'none', width: '28%' }}>
                            Responsable {sortColumn === 'Responsable Principal' && (sortDirection === 'asc' ? '▲' : '▼')}
                          </th>
                          <th style={{ width: '22%', textAlign: 'center' }}>Días (Desde - Hasta)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredData.map((item, index) => {
                          const blockClass = index % 2 === 0 ? 'task-block-even' : 'task-block-odd';
                          const colSpanContent = isEditing ? 4 : 4;

                          return isEditing ? (
                            <React.Fragment key={item.id_key}>
                              {/* Renglón 1: Parámetros (Modo Edición) */}
                              <tr className={`task-row-params ${blockClass}`}>
                                <td rowSpan={3} style={{ textAlign: 'center', verticalAlign: 'top', paddingTop: '1rem', width: '50px' }}>
                                  <button 
                                    onClick={() => handleDeleteTask(item.id_key)}
                                    className="toggle-btn"
                                    title="Eliminar tarea"
                                    style={{ padding: '0.4rem', color: '#ef4444', borderColor: '#ef4444' }}
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </td>

                                {/* Área (Desplegable) */}
                                <td>
                                  <span className="task-field-title">Área</span>
                                  <select 
                                    className="edit-input" 
                                    value={getProp(item, 'Area')}
                                    onChange={(e) => handleCellChange(item.id_key, 'Area', e.target.value)}
                                    style={{ fontWeight: 600, marginTop: '0.2rem' }}
                                  >
                                    {filterOptions.Area.map(a => (
                                      <option key={a} value={a}>{a}</option>
                                    ))}
                                    {!filterOptions.Area.includes(getProp(item, 'Area')) && getProp(item, 'Area') && (
                                      <option value={getProp(item, 'Area')}>{getProp(item, 'Area')}</option>
                                    )}
                                  </select>
                                </td>

                                {/* Período (Desplegable) */}
                                <td>
                                  <span className="task-field-title">Período del Mes</span>
                                  <select 
                                    className="edit-input" 
                                    value={getProp(item, 'Período del Mes')}
                                    onChange={(e) => handleCellChange(item.id_key, 'Período del Mes', e.target.value)}
                                    style={{ marginTop: '0.2rem' }}
                                  >
                                    {filterOptions['Período del Mes'].map(p => (
                                      <option key={p} value={p}>{p}</option>
                                    ))}
                                    {!filterOptions['Período del Mes'].includes(getProp(item, 'Período del Mes')) && getProp(item, 'Período del Mes') && (
                                      <option value={getProp(item, 'Período del Mes')}>{getProp(item, 'Período del Mes')}</option>
                                    )}
                                  </select>
                                </td>

                                {/* Responsable (Desplegable) */}
                                <td>
                                  <span className="task-field-title">Responsable Principal</span>
                                  <select 
                                    className="edit-input" 
                                    value={getProp(item, 'Responsable Principal')}
                                    onChange={(e) => handleCellChange(item.id_key, 'Responsable Principal', e.target.value)}
                                    style={{ fontWeight: 600, marginTop: '0.2rem' }}
                                  >
                                    {filterOptions['Responsable Principal'].map(r => (
                                      <option key={r} value={r}>{r}</option>
                                    ))}
                                    {!filterOptions['Responsable Principal'].includes(getProp(item, 'Responsable Principal')) && getProp(item, 'Responsable Principal') && (
                                      <option value={getProp(item, 'Responsable Principal')}>{getProp(item, 'Responsable Principal')}</option>
                                    )}
                                  </select>
                                </td>

                                {/* Días */}
                                <td style={{ textAlign: 'center' }}>
                                  <span className="task-field-title">Días</span>
                                  <div style={{ display: 'flex', gap: '0.3rem', justifyContent: 'center', alignItems: 'center', marginTop: '0.2rem' }}>
                                    <input 
                                      className="edit-input" 
                                      style={{ width: '70px', textAlign: 'center' }}
                                      value={getProp(item, 'Desde')}
                                      onChange={(e) => handleCellChange(item.id_key, 'Desde', e.target.value)}
                                      placeholder="Desde"
                                    />
                                    <span>-</span>
                                    <input 
                                      className="edit-input" 
                                      style={{ width: '70px', textAlign: 'center' }}
                                      value={getProp(item, 'Hasta')}
                                      onChange={(e) => handleCellChange(item.id_key, 'Hasta', e.target.value)}
                                      placeholder="Hasta"
                                    />
                                  </div>
                                </td>
                              </tr>

                              {/* Renglón 2: Tarea Crítica (Modo Edición) */}
                              <tr className={`task-row-content ${blockClass}`}>
                                <td colSpan={colSpanContent}>
                                  <div className="task-field-box">
                                    <span className="task-field-title">Tarea Crítica de Carga y Control</span>
                                    <textarea 
                                      className="edit-input edit-textarea"
                                      style={{ width: '100%', minHeight: '65px', boxSizing: 'border-box' }}
                                      value={getProp(item, 'Tareas Críticas de Carga y Control')}
                                      onChange={(e) => handleCellChange(item.id_key, 'Tareas Críticas de Carga y Control', e.target.value)}
                                      placeholder="Descripción de la tarea crítica..."
                                    />
                                  </div>
                                </td>
                              </tr>

                              {/* Renglón 3: Entregable (Modo Edición) */}
                              <tr className={`task-row-deliverable ${blockClass}`}>
                                <td colSpan={colSpanContent}>
                                  <div className="task-field-box">
                                    <span className="task-field-title">Entregable / Resultado Esperado</span>
                                    <input 
                                      className="edit-input" 
                                      style={{ width: '100%', boxSizing: 'border-box' }}
                                      value={getProp(item, 'Entregable')}
                                      onChange={(e) => handleCellChange(item.id_key, 'Entregable', e.target.value)}
                                      placeholder="Impacto o entregable..."
                                    />
                                  </div>
                                </td>
                              </tr>
                            </React.Fragment>
                          ) : (
                            <React.Fragment key={item.id_key}>
                              {/* Renglón 1: Parámetros (Modo Normal) */}
                              <tr className={`task-row-params ${blockClass}`}>
                                <td>
                                  <span className="badge-area">
                                    {getProp(item, 'Area')}
                                  </span>
                                </td>
                                <td style={{ color: 'var(--text-color)', opacity: 0.9 }}>
                                  {getProp(item, 'Período del Mes')}
                                </td>
                                <td style={{ fontWeight: 700, color: 'var(--text-color)' }}>
                                  {getProp(item, 'Responsable Principal')}
                                </td>
                                <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                                  <span style={{ 
                                    display: 'inline-block',
                                    padding: '0.2rem 0.6rem', 
                                    borderRadius: '4px',
                                    backgroundColor: 'rgba(42, 100, 88, 0.1)', 
                                    fontWeight: 600,
                                    fontSize: '0.85rem'
                                  }}>
                                    {getProp(item, 'Desde') === getProp(item, 'Hasta') ? getProp(item, 'Desde') : `${getProp(item, 'Desde')} a ${getProp(item, 'Hasta')}`}
                                  </span>
                                </td>
                              </tr>

                              {/* Renglón 2: Tarea Crítica a todo el ancho (Modo Normal) */}
                              <tr className={`task-row-content ${blockClass}`}>
                                <td colSpan={4}>
                                  <div className="task-field-box">
                                    <span className="task-field-title">Tarea Crítica</span>
                                    <div className="task-field-value">
                                      {getProp(item, 'Tareas Críticas de Carga y Control')}
                                    </div>
                                  </div>
                                </td>
                              </tr>

                              {/* Renglón 3: Entregable a todo el ancho (Modo Normal) */}
                              <tr className={`task-row-deliverable ${blockClass}`}>
                                <td colSpan={4}>
                                  <div className="task-field-box">
                                    <span className="task-field-title">Entregable</span>
                                    <div className="task-field-value" style={{ opacity: 0.88, fontStyle: 'italic' }}>
                                      {getProp(item, 'Entregable') || '—'}
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Vista Torta */}
                {viewMode === 'pie' && (
                  <ResponsiveContainer width="100%" height={400}>
                    <PieChart>
                      <Pie
                        data={statsByResponsible}
                        cx="50%"
                        cy="50%"
                        innerRadius={80}
                        outerRadius={140}
                        paddingAngle={5}
                        dataKey="count"
                        nameKey="name"
                      >
                        {statsByResponsible.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip formatter={(val, name) => [`${val} tareas`, name]} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}

                {/* Vista Barras */}
                {viewMode === 'bar' && (
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={statsByResponsible} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <XAxis dataKey="name" />
                      <YAxis />
                      <RechartsTooltip formatter={(val) => [`${val} tareas`, 'Cantidad']} />
                      <Bar dataKey="count" name="Tareas Asignadas" fill="var(--primary-color)" radius={[4, 4, 0, 0]}>
                        {statsByResponsible.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}

                {filteredData.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '3rem', opacity: 0.5 }}>
                    No hay tareas para los filtros seleccionados.
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* Vista: Diagrama de Gantt */}
        {currentPage === 'gantt' && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="dashboard-section" style={{ zIndex: 1 }}>
            <div className="section-header" style={{ marginBottom: '1.5rem' }}>
              <div>
                <div className="section-title">Diagrama de Gantt del Ciclo Mensual (Días 1 al 31)</div>
                <div style={{ fontSize: '0.85rem', opacity: 0.7, marginTop: '0.25rem' }}>
                  Simulación de tareas recurrentes por día calendario para IIN
                </div>
              </div>
            </div>

            <div className="gantt-container">
              <div className="gantt-chart">
                {(() => {
                  let ganttStart = parseInt(filterDiaDesde, 10) || 1;
                  let ganttEnd = parseInt(filterDiaHasta, 10) || 31;
                  if (ganttStart < 1) ganttStart = 1;
                  if (ganttEnd > 31) ganttEnd = 31;
                  if (ganttStart > ganttEnd) ganttStart = ganttEnd;

                  const totalGanttDays = Math.max(1, ganttEnd - ganttStart + 1);
                  const ganttDaysArray = Array.from({ length: totalGanttDays }, (_, i) => ganttStart + i);

                  return (
                    <>
                      <div className="gantt-header-row">
                        <div className="gantt-label" style={{ fontWeight: 700 }}>Responsable & Tarea Crítica</div>
                        <div className="gantt-days">
                          {ganttDaysArray.map((day) => (
                            <div key={day} className="gantt-day-marker">{day}</div>
                          ))}
                        </div>
                      </div>

                      {filteredData.map((item, idx) => {
                        const rawDesde = getProp(item, 'Desde');
                        const rawHasta = getProp(item, 'Hasta');
                        const desdeList = parseDayRanges(rawDesde);
                        const hastaList = parseDayRanges(rawHasta);

                        // Crear segmentos de barras (admite tanto rangos contiguos como listas separadas por ';')
                        const segments = [];
                        if (desdeList.length > 1) {
                          // Caso puntual recurrente: ej. 1;8;15;22
                          desdeList.forEach((d, i) => {
                            const h = hastaList[i] !== undefined ? hastaList[i] : d;
                            segments.push({ start: d, end: h });
                          });
                        } else {
                          // Caso continuo: ej. 5 al 7 o 1 al 31
                          const d = desdeList.length > 0 ? desdeList[0] : 1;
                          const h = hastaList.length > 0 ? hastaList[0] : d;
                          segments.push({ start: d, end: h });
                        }

                        // Verificar si algún segmento cae dentro del rango visualizado
                        const visibleSegments = segments.filter(seg => seg.start <= ganttEnd && seg.end >= ganttStart);
                        if (visibleSegments.length === 0) return null;

                        const taskName = getProp(item, 'Tareas Críticas de Carga y Control') || '';
                        const resp = getProp(item, 'Responsable Principal') || '';
                        const area = getProp(item, 'Area') || '';
                        const taskResumed = taskName.length >= 45 ? taskName.substring(0, 42) + '...' : taskName;
                        const labelFull = `[${area}] ${resp}: ${taskName}`;
                        const labelResumed = `[${area}] ${resp}: ${taskResumed}`;

                        return (
                          <div className="gantt-row" key={item.id_key || idx}>
                            <div 
                              className="gantt-label" 
                              style={{ fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} 
                              title={labelFull}
                            >
                              <strong style={{ color: 'var(--primary-color)' }}>{resp}</strong>: {taskResumed}
                            </div>
                            <div className="gantt-bar-container" style={{ position: 'relative' }}>
                              {visibleSegments.map((seg, sIdx) => {
                                const startDay = Math.max(ganttStart, seg.start);
                                const endDay = Math.min(ganttEnd, seg.end);
                                const width = ((endDay - startDay + 1) / totalGanttDays) * 100;
                                const left = ((startDay - ganttStart) / totalGanttDays) * 100;

                                return (
                                  <div 
                                    key={sIdx}
                                    className="gantt-bar" 
                                    style={{ 
                                      position: 'absolute',
                                      left: `${left}%`, 
                                      width: `${Math.max(width, 1.5)}%`,
                                      backgroundColor: COLORS[idx % COLORS.length],
                                      cursor: 'pointer'
                                    }}
                                    onClick={() => setModalContent({ 
                                      title: `Detalle de Tarea (${area})`, 
                                      body: `Responsable: ${resp}\nPeríodo: ${getProp(item, 'Período del Mes')}\nDías: ${seg.start} al ${seg.end}\n\nTarea:\n${taskName}\n\nEntregable:\n${getProp(item, 'Entregable')}` 
                                    })}
                                    title={labelFull}
                                  />
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </>
                  );
                })()}

                {filteredData.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '3rem', opacity: 0.5 }}>
                    No hay tareas para graficar en el rango seleccionado.
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

      </main>

      {/* Modal para detalle o entregables */}
      <AnimatePresence>
        {modalContent && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="modal-overlay" 
            onClick={() => setModalContent(null)}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="modal-content" 
              onClick={e => e.stopPropagation()}
            >
              <div className="modal-header">
                <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>{modalContent.title}</h3>
                <button className="modal-close" onClick={() => setModalContent(null)}>
                  <X size={20} />
                </button>
              </div>
              <div style={{ lineHeight: '1.6', opacity: 0.9, whiteSpace: 'pre-wrap' }}>
                {modalContent.body}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal para Agregar Nueva Tarea */}
      <AnimatePresence>
        {isAddModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="modal-overlay" 
            style={{ zIndex: 9999 }}
            onClick={() => setIsAddModalOpen(false)}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="modal-content" 
              style={{ maxWidth: '550px' }}
              onClick={e => e.stopPropagation()}
            >
              <div className="modal-header">
                <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Agregar Nueva Tarea al Calendario</h3>
                <button className="modal-close" onClick={() => setIsAddModalOpen(false)}>
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleAddTaskSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Área Operativa</label>
                  <input 
                    className="edit-input"
                    value={newTask['Area']}
                    onChange={(e) => setNewTask(prev => ({ ...prev, 'Area': e.target.value }))}
                    placeholder="Financiero, Sueldos, Stock, Impuestos..."
                    required
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Responsable Principal</label>
                  <input 
                    className="edit-input"
                    value={newTask['Responsable Principal']}
                    onChange={(e) => setNewTask(prev => ({ ...prev, 'Responsable Principal': e.target.value }))}
                    placeholder="Asistente, Rosana, Nicolás..."
                    required
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Período del Mes</label>
                  <input 
                    className="edit-input"
                    value={newTask['Período del Mes']}
                    onChange={(e) => setNewTask(prev => ({ ...prev, 'Período del Mes': e.target.value }))}
                    placeholder="Todos los Lunes, Días 01 al 02, etc."
                    required
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Tarea Crítica de Carga y Control</label>
                  <textarea 
                    className="edit-input edit-textarea"
                    value={newTask['Tareas Críticas de Carga y Control']}
                    onChange={(e) => setNewTask(prev => ({ ...prev, 'Tareas Críticas de Carga y Control': e.target.value }))}
                    placeholder="Descripción detallada de la tarea..."
                    required
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Entregable / Impacto</label>
                  <input 
                    className="edit-input"
                    value={newTask['Entregable']}
                    onChange={(e) => setNewTask(prev => ({ ...prev, 'Entregable': e.target.value }))}
                    placeholder="ABACCUS actualizado, Recibos listos, etc."
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Día Desde (ej. 1 o 1;8;15)</label>
                    <input 
                      className="edit-input"
                      value={newTask['Desde']}
                      onChange={(e) => setNewTask(prev => ({ ...prev, 'Desde': e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Día Hasta (ej. 31 o 1;8;15)</label>
                    <input 
                      className="edit-input"
                      value={newTask['Hasta']}
                      onChange={(e) => setNewTask(prev => ({ ...prev, 'Hasta': e.target.value }))}
                      required
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                  <button type="button" onClick={() => setIsAddModalOpen(false)} className="toggle-btn" style={{ flex: 1 }}>
                    Cancelar
                  </button>
                  <button type="submit" className="toggle-btn active" style={{ flex: 1 }}>
                    Guardar Tarea
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer y Acceso a Edición (Botón Pi) */}
      <footer className="footer" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <p style={{ fontWeight: 700, fontSize: '1.125rem', margin: 0 }}>{configData.footer.authorName}</p>
          <a href={`https://wa.me/${configData.footer.whatsappPhone}`} 
             target="_blank" 
             rel="noopener noreferrer" 
             style={{ display: 'flex', alignItems: 'center', textDecoration: 'none', transition: 'transform 0.2s ease' }} 
             onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.15)'} 
             onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'} 
             title="WhatsApp"
          >
            <svg viewBox="0 0 24 24" width="28" height="28" fill="#25D366">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.82 9.82 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
            </svg>
          </a>
        </div>

        {configData.footer.showExtraReference && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '1.5rem', color: 'var(--text-color)', opacity: 0.5, margin: '0 0.25rem', fontWeight: 300 }}>|</span>
            <p style={{ fontWeight: 700, fontSize: '1.125rem', margin: 0, color: 'var(--text-color)' }}>{configData.footer.extraReferenceText}</p>
            {((theme === 'dark' && configData.footer.extraReferenceLogoDarkUrl) || (theme === 'light' && configData.footer.extraReferenceLogoLightUrl)) && (
              <img 
                src={theme === 'dark' ? configData.footer.extraReferenceLogoDarkUrl : configData.footer.extraReferenceLogoLightUrl}
                alt={configData.footer.extraReferenceText}
                style={{ height: '32px', width: 'auto', objectFit: 'contain' }}
              />
            )}
          </div>
        )}

        {/* Botón Pi para Edición */}
        <button 
          className="pi-button"
          onClick={handlePiClick}
          title="Modo Edición / Gestión de Tareas"
          style={{
            position: 'absolute',
            right: '2rem',
            background: 'none',
            border: 'none',
            fontSize: '1.5rem',
            cursor: 'pointer',
            opacity: isEditing ? 1 : 0.5,
            color: isEditing ? 'var(--primary-color)' : 'var(--text-color)',
            transition: 'all 0.3s ease',
            zIndex: 100
          }}
        >
          π
        </button>

        {isEditing && (
          <div style={{ position: 'fixed', bottom: '5rem', right: '2rem', display: 'flex', gap: '1rem', zIndex: 1000 }}>
            <button 
              onClick={() => { setIsEditing(false); setEditableData(rawData); }}
              className="toggle-btn"
              style={{ backgroundColor: '#6b7280', color: 'white' }}
            >
              Cancelar
            </button>
            <button 
              onClick={handleSaveAll}
              className="toggle-btn active"
            >
              Guardar Cambios
            </button>
          </div>
        )}
      </footer>

      {/* Modal de Contraseña para Pi */}
      <AnimatePresence>
        {isAuthModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="modal-overlay" 
            style={{ 
              zIndex: 9999, 
              backgroundColor: 'rgba(15, 23, 42, 0.95)',
              backdropFilter: 'blur(10px)'
            }}
            onClick={() => setIsAuthModalOpen(false)}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="modal-content" 
              style={{ maxWidth: '350px', textAlign: 'center' }}
              onClick={e => e.stopPropagation()}
            >
              <div className="modal-header">
                <h3 style={{ fontSize: '1.25rem', fontWeight: 600, width: '100%', marginBottom: '0.5rem' }}>Acceso Administrativo</h3>
              </div>
              <p style={{ fontSize: '0.875rem', opacity: 0.7, marginBottom: '1.5rem' }}>Ingresa la contraseña para editar, agregar o eliminar tareas.</p>
              <form onSubmit={handleAuthSubmit}>
                <input 
                  type="password" 
                  placeholder="Contraseña" 
                  className="edit-input"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  autoFocus
                  style={{ textAlign: 'center', marginBottom: '1.5rem', padding: '0.75rem', fontSize: '1.1rem' }}
                />
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button type="button" onClick={() => setIsAuthModalOpen(false)} className="toggle-btn" style={{ flex: 1, padding: '0.75rem' }}>Cancelar</button>
                  <button type="submit" className="toggle-btn active" style={{ flex: 1, padding: '0.75rem' }}>Entrar</button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
