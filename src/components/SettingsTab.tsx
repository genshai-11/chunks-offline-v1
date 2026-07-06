/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { sandboxDb, supabase } from '../lib/supabaseClient';
import { CCIStandardCard, CVRUnit, CCIPerformanceParameter } from '../types';
import { 
  Sliders, Edit2, Trash2, Plus, Settings2, SlidersHorizontal, 
  Sparkles, CheckCircle2, Smartphone, Eye, Info, ChevronRight, RotateCcw, AlertCircle
} from 'lucide-react';

interface SettingsTabProps {
  useSandbox: boolean;
  cciCards: CCIStandardCard[];
  cvrUnits: CVRUnit[];
  onRefreshData: () => void;
}

export default function SettingsTab({
  useSandbox,
  cciCards,
  cvrUnits,
  onRefreshData
}: SettingsTabProps) {
  // Tab within settings
  const [activeSettingsSubtab, setActiveSettingsSubtab] = useState<'cci_cvr' | 'performance_y'>('performance_y');

  // --- CCI State ---
  const [editingCciId, setEditingCciId] = useState<string | null>(null);
  const [newCciLabel, setNewCciLabel] = useState<string>('');
  const [newCciCategory, setNewCciCategory] = useState<string>('pronunciation');
  const [newCciValue, setNewCciValue] = useState<number>(10);

  const [editCciLabel, setEditCciLabel] = useState<string>('');
  const [editCciCategory, setEditCciCategory] = useState<string>('pronunciation');
  const [editCciValue, setEditCciValue] = useState<number>(10);

  // --- CVR State ---
  const [editingCvrId, setEditingCvrId] = useState<string | null>(null);
  const [newCvrLabel, setNewCvrLabel] = useState<string>('');
  const [newCvrSymbol, setNewCvrSymbol] = useState<string>('Ω');
  const [newCvrValue, setNewCvrValue] = useState<number>(1.0);

  const [editCvrLabel, setEditCvrLabel] = useState<string>('');
  const [editCvrSymbol, setEditCvrSymbol] = useState<string>('Ω');
  const [editCvrValue, setEditCvrValue] = useState<number>(1.0);

  // --- CCI Performance Parameters State ---
  const [performanceParams, setPerformanceParams] = useState<CCIPerformanceParameter[]>([]);
  const [editingParamId, setEditingParamId] = useState<string | null>(null);

  // Form states for new Parameter
  const [newParamLabel, setNewParamLabel] = useState<string>('');
  const [newParamColorCode, setNewParamColorCode] = useState<string>('orange');
  const [newParamColorHex, setNewParamColorHex] = useState<string>('#F97316');
  const [newParamY, setNewParamY] = useState<number>(4);
  const [newParamDesc, setNewParamDesc] = useState<string>('Excellent Plus');

  // Form states for editing Parameter
  const [editParamLabel, setEditParamLabel] = useState<string>('');
  const [editParamColorCode, setEditParamColorCode] = useState<string>('');
  const [editParamColorHex, setEditParamColorHex] = useState<string>('');
  const [editParamY, setEditParamY] = useState<number>(0);
  const [editParamDesc, setEditParamDesc] = useState<string>('');

  // Interactive Mockup States
  const [mockSelectedParam, setMockSelectedParam] = useState<CCIPerformanceParameter | null>(null);
  const [mockCciX, setMockCciX] = useState<number>(15);
  const [mockCvrValue, setMockCvrValue] = useState<number>(1.5);
  const [mockReflectionSec, setMockReflectionSec] = useState<number>(3.5);

  // Load performance parameters from sandboxDb
  useEffect(() => {
    setPerformanceParams([...sandboxDb.cciPerformanceParameters]);
  }, [cciCards, cvrUnits]);

  // Sync listener to ensure updates propagate
  useEffect(() => {
    const handleDbChange = () => {
      setPerformanceParams([...sandboxDb.cciPerformanceParameters]);
    };
    window.addEventListener('chunks_sandbox_db_change', handleDbChange);
    return () => {
      window.removeEventListener('chunks_sandbox_db_change', handleDbChange);
    };
  }, []);

  // Set first parameter as default mockup selected
  useEffect(() => {
    if (performanceParams.length > 0 && !mockSelectedParam) {
      setMockSelectedParam(performanceParams[0]);
    }
  }, [performanceParams, mockSelectedParam]);

  // --- CCI Standard Card Mutation Handlers ---
  const handleSaveCci = (e: React.FormEvent) => {
    e.preventDefault();
    const isEdit = !!editingCciId;
    const labelToSave = isEdit ? editCciLabel : newCciLabel;
    const valueToSave = isEdit ? editCciValue : newCciValue;
    const categoryToSave = isEdit ? editCciCategory : newCciCategory;

    if (!labelToSave.trim()) return;

    if (useSandbox) {
      let cards = [...sandboxDb.cciStandardCards];
      if (isEdit) {
        cards = cards.map(c => c.id === editingCciId ? {
          ...c,
          label: labelToSave.trim(),
          standard_value: Number(valueToSave),
          category_id: categoryToSave,
          updated_at: new Date().toISOString()
        } : c);
      } else {
        cards.push({
          id: "card_" + crypto.randomUUID().substring(0, 8),
          category_id: categoryToSave,
          label: labelToSave.trim(),
          standard_value: Number(valueToSave),
          active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      }
      sandboxDb.cciStandardCards = cards;
      setNewCciLabel('');
      setNewCciValue(10);
      setEditingCciId(null);
      onRefreshData();
    } else {
      const executeSaveCci = async () => {
        try {
          if (isEdit) {
            const { error } = await supabase
              .from('cci_standard_cards')
              .update({
                label: labelToSave.trim(),
                standard_value: Number(valueToSave),
                category_id: categoryToSave,
                updated_at: new Date().toISOString()
              })
              .eq('id', editingCciId);
            if (error) throw error;
          } else {
            const { error } = await supabase
              .from('cci_standard_cards')
              .insert([{
                id: crypto.randomUUID(),
                category_id: categoryToSave,
                label: labelToSave.trim(),
                standard_value: Number(valueToSave),
                active: true,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              }]);
            if (error) throw error;
          }
          setNewCciLabel('');
          setNewCciValue(10);
          setEditingCciId(null);
          onRefreshData();
        } catch (err: any) {
          alert("Failed to save standard to Supabase: " + err.message);
        }
      };
      executeSaveCci();
    }
  };

  const handleDeleteCci = (id: string) => {
    if (!window.confirm("Are you sure you want to delete this CCI standard card?")) return;
    if (useSandbox) {
      sandboxDb.cciStandardCards = sandboxDb.cciStandardCards.filter(c => c.id !== id);
      onRefreshData();
    } else {
      const executeDelete = async () => {
        try {
          const { error } = await supabase
            .from('cci_standard_cards')
            .delete()
            .eq('id', id);
          if (error) throw error;
          onRefreshData();
        } catch (err: any) {
          alert("Failed to delete CCI standard: " + err.message);
        }
      };
      executeDelete();
    }
  };

  // --- CVR Mutation Handlers ---
  const handleSaveCvr = (e: React.FormEvent) => {
    e.preventDefault();
    const isEdit = !!editingCvrId;
    const labelToSave = isEdit ? editCvrLabel : newCvrLabel;
    const symbolToSave = isEdit ? editCvrSymbol : newCvrSymbol;
    const valueToSave = isEdit ? editCvrValue : newCvrValue;

    if (!labelToSave.trim()) return;

    if (useSandbox) {
      let units = [...sandboxDb.cvrUnits];
      if (isEdit) {
        units = units.map(u => u.id === editingCvrId ? {
          ...u,
          label: labelToSave.trim(),
          unit_symbol: symbolToSave.trim(),
          value: Number(valueToSave),
          updated_at: new Date().toISOString()
        } : u);
      } else {
        units.push({
          id: "unit_" + crypto.randomUUID().substring(0, 8),
          label: labelToSave.trim(),
          unit_symbol: symbolToSave.trim(),
          value: Number(valueToSave),
          active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      }
      sandboxDb.cvrUnits = units;
      setNewCvrLabel('');
      setNewCvrValue(1.0);
      setEditingCvrId(null);
      onRefreshData();
    } else {
      const executeSaveCvr = async () => {
        try {
          if (isEdit) {
            const { error } = await supabase
              .from('cvr_units')
              .update({
                label: labelToSave.trim(),
                unit_symbol: symbolToSave.trim(),
                value: Number(valueToSave),
                updated_at: new Date().toISOString()
              })
              .eq('id', editingCvrId);
            if (error) throw error;
          } else {
            const { error } = await supabase
              .from('cvr_units')
              .insert([{
                id: crypto.randomUUID(),
                label: labelToSave.trim(),
                unit_symbol: symbolToSave.trim(),
                value: Number(valueToSave),
                active: true,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              }]);
            if (error) throw error;
          }
          setNewCvrLabel('');
          setNewCvrValue(1.0);
          setEditingCvrId(null);
          onRefreshData();
        } catch (err: any) {
          alert("Failed to save CVR standard: " + err.message);
        }
      };
      executeSaveCvr();
    }
  };

  const handleDeleteCvr = (id: string) => {
    if (!window.confirm("Are you sure you want to delete this CVR multiplier unit?")) return;
    if (useSandbox) {
      sandboxDb.cvrUnits = sandboxDb.cvrUnits.filter(u => u.id !== id);
      onRefreshData();
    } else {
      const executeDelete = async () => {
        try {
          const { error } = await supabase
            .from('cvr_units')
            .delete()
            .eq('id', id);
          if (error) throw error;
          onRefreshData();
        } catch (err: any) {
          alert("Failed to delete CVR multiplier: " + err.message);
        }
      };
      executeDelete();
    }
  };

  // --- CCI Performance Parameters Mutation Handlers ---
  const handleSaveParam = (e: React.FormEvent) => {
    e.preventDefault();
    const isEdit = !!editingParamId;
    const labelToSave = isEdit ? editParamLabel : newParamLabel;
    const colorCodeToSave = isEdit ? editParamColorCode : newParamColorCode;
    const colorHexToSave = isEdit ? editParamColorHex : newParamColorHex;
    const yToSave = isEdit ? editParamY : newParamY;
    const descToSave = isEdit ? editParamDesc : newParamDesc;

    if (!labelToSave.trim()) return;

    let updatedList = [...sandboxDb.cciPerformanceParameters];

    if (isEdit) {
      updatedList = updatedList.map(p => p.id === editingParamId ? {
        ...p,
        label: labelToSave.trim(),
        color_code: colorCodeToSave.trim(),
        color_hex: colorHexToSave.trim(),
        performance_y: Number(yToSave),
        description: descToSave.trim(),
        updated_at: new Date().toISOString()
      } : p);
    } else {
      updatedList.push({
        id: "param_" + crypto.randomUUID().substring(0, 8),
        label: labelToSave.trim(),
        color_code: colorCodeToSave.trim(),
        color_hex: colorHexToSave.trim(),
        performance_y: Number(yToSave),
        description: descToSave.trim(),
        active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    }

    // Sort parameters by performance Y value ascending to preserve standard grade order (Y=0, Y=1, Y=2...)
    updatedList.sort((a, b) => a.performance_y - b.performance_y);

    sandboxDb.cciPerformanceParameters = updatedList;
    setPerformanceParams(updatedList);

    if (isEdit) {
      setEditingParamId(null);
    } else {
      setNewParamLabel('');
      setNewParamY(updatedList.length);
      setNewParamDesc('');
    }

    // Notify other components of database change
    onRefreshData();
  };

  const handleDeleteParam = (id: string) => {
    if (performanceParams.length <= 2) {
      alert("You must keep at least 2 scoring parameters to guarantee classroom grading is possible.");
      return;
    }
    if (!window.confirm("Are you sure you want to delete this scoring response parameter? This will immediately remove this button from the student interface.")) return;

    const filtered = sandboxDb.cciPerformanceParameters.filter(p => p.id !== id);
    sandboxDb.cciPerformanceParameters = filtered;
    setPerformanceParams(filtered);
    if (mockSelectedParam?.id === id) {
      setMockSelectedParam(filtered[0] || null);
    }
    onRefreshData();
  };

  const handleResetParamsToDefault = () => {
    if (window.confirm("Reset all performance parameters and buttons back to original standard (Red, Yellow, Green, Purple)?")) {
      localStorage.removeItem('chunks_sandbox_cci_performance_parameters');
      const defaults = [...sandboxDb.cciPerformanceParameters];
      setPerformanceParams(defaults);
      setMockSelectedParam(defaults[0] || null);
      onRefreshData();
    }
  };

  // Safe color name to HEX lookup fallback
  const getTailwindBgColor = (code: string) => {
    const map: Record<string, string> = {
      red: 'bg-red-500',
      orange: 'bg-orange-500',
      amber: 'bg-amber-500',
      yellow: 'bg-yellow-500',
      lime: 'bg-lime-500',
      green: 'bg-green-500',
      emerald: 'bg-emerald-500',
      teal: 'bg-teal-500',
      cyan: 'bg-cyan-500',
      sky: 'bg-sky-500',
      blue: 'bg-blue-500',
      indigo: 'bg-indigo-600',
      violet: 'bg-violet-600',
      purple: 'bg-purple-600',
      fuchsia: 'bg-fuchsia-600',
      pink: 'bg-pink-500',
      rose: 'bg-rose-500',
      gray: 'bg-slate-500',
    };
    return map[code.toLowerCase()] || 'bg-slate-500';
  };

  // Helper to sync Hex on color pre-set select
  const handleColorPresetChange = (preset: string, isEditMode: boolean) => {
    const hexMap: Record<string, string> = {
      red: '#EF4444',
      orange: '#F97316',
      amber: '#F59E0B',
      yellow: '#EAB308',
      lime: '#84CC16',
      green: '#22C55E',
      emerald: '#10B981',
      teal: '#14B8A6',
      cyan: '#06B6D4',
      sky: '#0EA5E9',
      blue: '#3B82F6',
      indigo: '#6366F1',
      violet: '#8B5CF6',
      purple: '#9333EA',
      fuchsia: '#D946EF',
      pink: '#EC4899',
      rose: '#F43F5E',
      gray: '#64748B',
    };
    const hex = hexMap[preset] || '#64748B';
    if (isEditMode) {
      setEditParamColorCode(preset);
      setEditParamColorHex(hex);
    } else {
      setNewParamColorCode(preset);
      setNewParamColorHex(hex);
    }
  };

  // Interactive Live formulas
  const calcMockCciResult = () => {
    const y = mockSelectedParam ? mockSelectedParam.performance_y : 0;
    return Math.round((y * mockCciX) * 100) / 100;
  };

  const calcMockCpdResult = () => {
    const cci = calcMockCciResult();
    return Math.round((cci * mockCvrValue) * 100) / 100;
  };

  return (
    <div className="space-y-6" id="settings-tab-root">
      
      {/* 1. Header with custom tabs */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-3xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <Settings2 className="w-5 h-5 text-red-600" />
            Classroom Scoring Settings Hub
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Configure dynamic evaluation variables, partition standard rubrics, and calibrate oral response buttons.
          </p>
        </div>

        <div className="flex bg-slate-100 p-1 rounded-xl shrink-0 self-start md:self-center border border-slate-200">
          <button
            onClick={() => setActiveSettingsSubtab('performance_y')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeSettingsSubtab === 'performance_y' 
                ? 'bg-white text-slate-900 shadow-3xs' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5 text-orange-500" />
            Learner Buttons & Preview
          </button>
          <button
            onClick={() => setActiveSettingsSubtab('cci_cvr')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeSettingsSubtab === 'cci_cvr' 
                ? 'bg-white text-slate-900 shadow-3xs' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-500" />
            CCI & CVR Matrices
          </button>
        </div>
      </div>

      {/* SUBTAB 1: CCI & CVR SPLIT MANAGEMENT */}
      {activeSettingsSubtab === 'cci_cvr' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fadeIn" id="cci-cvr-settings-partition">
          
          {/* Column Left: CCI Standards */}
          <div className="lg:col-span-6 bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                  <Sliders className="w-4 h-4 text-red-600" />
                  CCI Standard Cards Manager
                </h3>
                <p className="text-[10px] text-slate-400 mt-0.5">Admin-defined oral rubric bench scores</p>
              </div>
              <span className="text-[10px] font-mono font-bold bg-red-50 text-red-700 px-2 py-0.5 rounded-full border border-red-100">
                {cciCards.length} Cards
              </span>
            </div>

            {/* Form for CCI Cards */}
            <form onSubmit={handleSaveCci} className={`p-4 rounded-xl border transition-colors space-y-3 ${
              editingCciId ? 'bg-amber-50/40 border-amber-200' : 'bg-slate-50/70 border-slate-200/60'
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  {editingCciId ? '✏️ Edit Existing Standard Card' : '➕ Register New Standard Card'}
                </span>
                {editingCciId && (
                  <button 
                    type="button" 
                    onClick={() => {
                      setEditingCciId(null);
                      setEditCciLabel('');
                      setEditCciValue(10);
                      setEditCciCategory('pronunciation');
                    }}
                    className="text-[10px] text-slate-400 hover:text-slate-800 font-bold"
                  >
                    Cancel
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                <div className="sm:col-span-12">
                  <label className="text-[9px] font-bold text-slate-400 uppercase">Standard Label</label>
                  <input 
                    type="text"
                    placeholder="e.g. Intermediate Phonemic Score X=12"
                    value={editingCciId ? editCciLabel : newCciLabel}
                    onChange={(e) => editingCciId ? setEditCciLabel(e.target.value) : setNewCciLabel(e.target.value)}
                    className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-red-500 focus:outline-none font-medium text-slate-800"
                    required
                  />
                </div>

                <div className="sm:col-span-7">
                  <label className="text-[9px] font-bold text-slate-400 uppercase">Scoring Rubric Category</label>
                  <select
                    value={editingCciId ? editCciCategory : newCciCategory}
                    onChange={(e) => editingCciId ? setEditCciCategory(e.target.value) : setNewCciCategory(e.target.value)}
                    className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-red-500 focus:outline-none text-slate-700"
                  >
                    <option value="pronunciation">Pronunciation Accuracy</option>
                    <option value="fluency">Oral Fluency & Pauses</option>
                    <option value="vocabulary">Vocabulary Range</option>
                    <option value="grammar">Grammar & Structure</option>
                  </select>
                </div>

                <div className="sm:col-span-5">
                  <label className="text-[9px] font-bold text-slate-400 uppercase">Multiplier Score (X)</label>
                  <input 
                    type="number"
                    value={editingCciId ? editCciValue : newCciValue}
                    onChange={(e) => editingCciId ? setEditCciValue(Number(e.target.value)) : setNewCciValue(Number(e.target.value))}
                    className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-red-500 focus:outline-none font-semibold text-slate-800"
                    required
                  />
                </div>
              </div>

              <button 
                type="submit"
                className={`w-full py-2 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer ${
                  editingCciId ? 'bg-amber-600 hover:bg-amber-700' : 'bg-slate-900 hover:bg-slate-800'
                }`}
              >
                {editingCciId ? 'Update Standard Card' : 'Register Standard Card'}
              </button>
            </form>

            {/* List of CCI Cards */}
            <div className="space-y-2 max-h-[300px] overflow-auto pr-1">
              {cciCards.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs italic">No CCI standard cards defined.</div>
              ) : (
                cciCards.map(c => (
                  <div key={c.id} className="flex items-center justify-between p-3.5 border border-slate-100 bg-slate-50/40 rounded-xl hover:border-slate-200 hover:bg-slate-50/80 transition-all group">
                    <div className="text-xs">
                      <span className="font-bold text-slate-800 block">{c.label}</span>
                      <span className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-widest block mt-0.5">{c.category_id}</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <span className="px-2.5 py-1 bg-red-50 text-red-700 font-mono font-bold text-xs rounded-lg border border-red-100">
                        X = {c.standard_value}
                      </span>
                      <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => {
                            setEditingCciId(c.id);
                            setEditCciLabel(c.label);
                            setEditCciValue(c.standard_value);
                            setEditCciCategory(c.category_id);
                          }}
                          className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-200/50 rounded-lg transition-all cursor-pointer"
                          title="Edit Card"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteCci(c.id)}
                          className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
                          title="Delete Card"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Column Right: CVR Multipliers */}
          <div className="lg:col-span-6 bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                  <Sliders className="w-4 h-4 text-indigo-600" />
                  CVR Multipliers Manager (Ω)
                </h3>
                <p className="text-[10px] text-slate-400 mt-0.5">Prompt complexity coefficients</p>
              </div>
              <span className="text-[10px] font-mono font-bold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-100">
                {cvrUnits.length} Coefficients
              </span>
            </div>

            {/* Form for CVR Units */}
            <form onSubmit={handleSaveCvr} className={`p-4 rounded-xl border transition-colors space-y-3 ${
              editingCvrId ? 'bg-amber-50/40 border-amber-200' : 'bg-slate-50/70 border-slate-200/60'
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  {editingCvrId ? '✏️ Edit Existing CVR Multiplier' : '➕ Register New CVR Multiplier'}
                </span>
                {editingCvrId && (
                  <button 
                    type="button" 
                    onClick={() => {
                      setEditingCvrId(null);
                      setEditCvrLabel('');
                      setEditCvrSymbol('Ω');
                      setEditCvrValue(1.0);
                    }}
                    className="text-[10px] text-slate-400 hover:text-slate-800 font-bold"
                  >
                    Cancel
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                <div className="sm:col-span-12">
                  <label className="text-[9px] font-bold text-slate-400 uppercase">Multiplier Title</label>
                  <input 
                    type="text"
                    placeholder="e.g. Advanced CVR Coefficient"
                    value={editingCvrId ? editCvrLabel : newCvrLabel}
                    onChange={(e) => editingCvrId ? setEditCvrLabel(e.target.value) : setNewCvrLabel(e.target.value)}
                    className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:outline-none font-medium text-slate-800"
                    required
                  />
                </div>

                <div className="sm:col-span-6">
                  <label className="text-[9px] font-bold text-slate-400 uppercase">Symbol</label>
                  <input 
                    type="text"
                    placeholder="e.g. Ω or Δ"
                    value={editingCvrId ? editCvrSymbol : newCvrSymbol}
                    onChange={(e) => editingCvrId ? setEditCvrSymbol(e.target.value) : setNewCvrSymbol(e.target.value)}
                    className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:outline-none font-mono font-bold text-indigo-700 text-center"
                    required
                  />
                </div>

                <div className="sm:col-span-6">
                  <label className="text-[9px] font-bold text-slate-400 uppercase">Multiplier Value (Ω)</label>
                  <input 
                    type="number"
                    step="0.05"
                    value={editingCvrId ? editCvrValue : newCvrValue}
                    onChange={(e) => editingCvrId ? setEditCvrValue(Number(e.target.value)) : setNewCvrValue(Number(e.target.value))}
                    className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:outline-none font-semibold text-slate-800"
                    required
                  />
                </div>
              </div>

              <button 
                type="submit"
                className={`w-full py-2 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer ${
                  editingCvrId ? 'bg-amber-600 hover:bg-amber-700' : 'bg-slate-900 hover:bg-slate-800'
                }`}
              >
                {editingCvrId ? 'Update CVR Multiplier' : 'Register CVR Multiplier'}
              </button>
            </form>

            {/* List of CVR Units */}
            <div className="space-y-2 max-h-[300px] overflow-auto pr-1">
              {cvrUnits.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs italic">No CVR multipliers defined.</div>
              ) : (
                cvrUnits.map(u => (
                  <div key={u.id} className="flex items-center justify-between p-3.5 border border-slate-100 bg-slate-50/40 rounded-xl hover:border-slate-200 hover:bg-slate-50/80 transition-all group">
                    <div className="text-xs">
                      <span className="font-bold text-slate-800 block">{u.label}</span>
                      <span className="text-[10px] text-slate-400">Indicator: <span className="font-mono font-bold text-indigo-600">{u.unit_symbol}</span></span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 font-mono font-bold text-xs rounded-lg border border-indigo-100">
                        Ω = {u.value}
                      </span>
                      <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => {
                            setEditingCvrId(u.id);
                            setEditCvrLabel(u.label);
                            setEditCvrSymbol(u.unit_symbol);
                            setEditCvrValue(u.value);
                          }}
                          className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-200/50 rounded-lg transition-all cursor-pointer"
                          title="Edit Multiplier"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteCvr(u.id)}
                          className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
                          title="Delete Multiplier"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      )}

      {/* SUBTAB 2: CCI PERFORMANCE PARAMETERS & LIVE MOCKUP */}
      {activeSettingsSubtab === 'performance_y' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fadeIn" id="performance-params-partition">
          
          {/* Column Left: Performance Parameters CRUD List */}
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-orange-500" />
                  CCI Performance Parameters (Dynamic Buttons)
                </h3>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Define the score grade buttons available for verbalization responses
                </p>
              </div>
              <button
                onClick={handleResetParamsToDefault}
                className="text-[10px] text-slate-400 hover:text-red-600 font-bold border border-slate-200 px-2 py-1 rounded hover:bg-slate-50 flex items-center gap-1 cursor-pointer transition-all"
                title="Reset parameter list"
              >
                <RotateCcw className="w-3 h-3" />
                Reset Defaults
              </button>
            </div>

            {/* Form for Performance Parameters */}
            <form onSubmit={handleSaveParam} className={`p-4 rounded-xl border transition-all space-y-4 ${
              editingParamId ? 'bg-amber-50/40 border-amber-200' : 'bg-slate-50/70 border-slate-200/60'
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                  {editingParamId ? '✏️ Edit Grade Button Option' : '➕ Construct New Grade Button Option'}
                </span>
                {editingParamId && (
                  <button 
                    type="button" 
                    onClick={() => {
                      setEditingParamId(null);
                      setEditParamLabel('');
                      setEditParamColorCode('orange');
                      setEditParamColorHex('#F97316');
                      setEditParamY(4);
                      setEditParamDesc('');
                    }}
                    className="text-[10px] text-slate-500 hover:text-slate-800 font-bold"
                  >
                    Cancel Edit
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5">
                
                {/* Option Name Label */}
                <div className="sm:col-span-4">
                  <label className="text-[9px] font-bold text-slate-500 block mb-0.5">BUTTON LABEL</label>
                  <input 
                    type="text"
                    placeholder="e.g. Orange, Excellent Plus"
                    value={editingParamId ? editParamLabel : newParamLabel}
                    onChange={(e) => editingParamId ? setEditParamLabel(e.target.value) : setNewParamLabel(e.target.value)}
                    className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-orange-500 focus:outline-none font-bold text-slate-800"
                    required
                  />
                </div>

                {/* Performance Value Y */}
                <div className="sm:col-span-3">
                  <label className="text-[9px] font-bold text-slate-500 block mb-0.5">PERFORMANCE SCORE (Y)</label>
                  <input 
                    type="number"
                    min={0}
                    max={10}
                    step={0.5}
                    value={editingParamId ? editParamY : newParamY}
                    onChange={(e) => editingParamId ? setEditParamY(Number(e.target.value)) : setNewParamY(Number(e.target.value))}
                    className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-orange-500 focus:outline-none font-bold text-slate-800"
                    required
                  />
                </div>

                {/* Preset Tailwind Color */}
                <div className="sm:col-span-5">
                  <label className="text-[9px] font-bold text-slate-500 block mb-0.5">COLOR PRESET</label>
                  <select
                    value={editingParamId ? editParamColorCode : newParamColorCode}
                    onChange={(e) => handleColorPresetChange(e.target.value, !!editingParamId)}
                    className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-orange-500 focus:outline-none text-slate-700 font-semibold"
                  >
                    <option value="red">🔴 Red (Classic Red)</option>
                    <option value="orange">🍊 Orange (Accent Orange)</option>
                    <option value="amber">🟡 Amber (Warm Gold)</option>
                    <option value="yellow">💛 Yellow (High contrast)</option>
                    <option value="lime">🟢 Lime (Fresh Lime)</option>
                    <option value="green">💚 Green (Active Good)</option>
                    <option value="emerald">💚 Emerald (Pristine Match)</option>
                    <option value="teal">💙 Teal (Deep Cyan)</option>
                    <option value="cyan">💙 Cyan (Neon Cyan)</option>
                    <option value="sky">💙 Sky (Lighter Blue)</option>
                    <option value="blue">💙 Blue (Classic Indigo)</option>
                    <option value="indigo">💜 Indigo (Royal Violet)</option>
                    <option value="purple">💜 Purple (Mastery)</option>
                    <option value="fuchsia">💖 Fuchsia (Accent Pink)</option>
                    <option value="rose">💖 Rose (Soft Red)</option>
                    <option value="gray">🩶 Slate Gray (Neutral)</option>
                  </select>
                </div>

                {/* Custom HEX code input */}
                <div className="sm:col-span-4">
                  <label className="text-[9px] font-bold text-slate-500 block mb-0.5">HEX CODE</label>
                  <div className="flex gap-2">
                    <input 
                      type="color"
                      value={editingParamId ? editParamColorHex : newParamColorHex}
                      onChange={(e) => editingParamId ? setEditParamColorHex(e.target.value) : setNewParamColorHex(e.target.value)}
                      className="w-8 h-8 p-0 border border-slate-200 rounded cursor-pointer shrink-0"
                    />
                    <input 
                      type="text"
                      placeholder="#000000"
                      value={editingParamId ? editParamColorHex : newParamColorHex}
                      onChange={(e) => editingParamId ? setEditParamColorHex(e.target.value) : setNewParamColorHex(e.target.value)}
                      className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-orange-500 focus:outline-none font-mono font-bold text-slate-700"
                      required
                    />
                  </div>
                </div>

                {/* Short explanation / description */}
                <div className="sm:col-span-8">
                  <label className="text-[9px] font-bold text-slate-500 block mb-0.5">SUBTEXT / DESCRIPTION</label>
                  <input 
                    type="text"
                    placeholder="e.g. Masterful articulation of phonemes"
                    value={editingParamId ? editParamDesc : newParamDesc}
                    onChange={(e) => editingParamId ? setEditParamDesc(e.target.value) : setNewParamDesc(e.target.value)}
                    className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-orange-500 focus:outline-none font-medium text-slate-800"
                  />
                </div>

              </div>

              <button 
                type="submit"
                className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                {editingParamId ? 'Apply Button Changes' : 'Append Button Option'}
              </button>
            </form>

            {/* List of active Performance Parameters */}
            <div className="space-y-3 pr-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Current Registered Buttons in Learner Interface ({performanceParams.length}):
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {performanceParams.map(p => (
                  <div 
                    key={p.id} 
                    className={`p-3 border rounded-2xl flex flex-col justify-between hover:scale-[1.01] transition-all group ${
                      editingParamId === p.id 
                        ? 'border-amber-400 bg-amber-50/20' 
                        : 'border-slate-100 bg-slate-50/40 hover:border-slate-200'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <span 
                          className="w-3.5 h-3.5 rounded-full border border-black/10 shrink-0" 
                          style={{ backgroundColor: p.color_hex }}
                        />
                        <div>
                          <strong className="text-xs text-slate-800 block">{p.label}</strong>
                          <span className="text-[9px] text-slate-400 italic block leading-none">{p.description}</span>
                        </div>
                      </div>
                      <span className="font-mono font-bold text-xs bg-slate-100 px-1.5 py-0.5 rounded text-slate-700 border border-slate-200/50">
                        Y = {p.performance_y}
                      </span>
                    </div>

                    <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-100">
                      <span className="font-mono text-[9px] text-slate-400">{p.color_hex}</span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingParamId(p.id);
                            setEditParamLabel(p.label);
                            setEditParamColorCode(p.color_code);
                            setEditParamColorHex(p.color_hex);
                            setEditParamY(p.performance_y);
                            setEditParamDesc(p.description);
                          }}
                          className="p-1 text-slate-400 hover:text-slate-800 rounded hover:bg-slate-100 transition-all cursor-pointer"
                          title="Edit color parameter"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteParam(p.id)}
                          className="p-1 text-slate-400 hover:text-red-600 rounded hover:bg-red-50 transition-all cursor-pointer"
                          title="Delete color parameter"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Column Right: Live Learner Screen Preview & Mockup */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Mockup Frame Container */}
            <div className="bg-[#1e293b] border border-slate-800 rounded-3xl p-5 shadow-lg relative overflow-hidden" id="phone-mockup-frame">
              
              {/* Phone Speaker Notch */}
              <div className="absolute top-2 left-1/2 -translate-x-1/2 w-28 h-4 bg-slate-900 rounded-full z-20 flex items-center justify-center">
                <span className="w-8 h-1 bg-slate-700 rounded-full" />
              </div>

              {/* Header inside the Mockup Screen */}
              <div className="text-center pt-4 pb-2.5 border-b border-slate-800">
                <span className="text-[10px] text-amber-500 font-mono font-bold tracking-widest uppercase block animate-pulse">
                  📱 Learner Screen Live Preview
                </span>
                <p className="text-[10px] text-slate-400">See changes immediately reflect below</p>
              </div>

              {/* The Simulated Learner Interface Screen */}
              <div className="bg-slate-50 rounded-2xl overflow-hidden mt-4 border border-slate-800 min-h-[460px] flex flex-col justify-between p-4 shadow-inner text-slate-900">
                
                {/* Simulated Header Status */}
                <div className="bg-slate-900 text-white -mx-4 -mt-4 px-4 py-3 flex items-center justify-between text-[10px]">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 bg-red-400 rounded-full animate-ping" />
                    <span className="font-mono text-red-400 font-semibold uppercase tracking-wider">Terminal Active</span>
                  </div>
                  <span className="text-slate-400">Student: <strong>Emily (Mock)</strong></span>
                </div>

                {/* Challenge Prompt Area */}
                <div className="bg-white border border-slate-200/80 rounded-xl p-3.5 shadow-3xs space-y-2 mt-2">
                  <div className="flex justify-between items-center text-[8px] font-bold text-slate-400 uppercase">
                    <span>Active Challenge Cue</span>
                    <span className="bg-slate-100 text-slate-600 px-1.5 rounded font-mono">A-001</span>
                  </div>
                  <p className="text-xs font-bold text-slate-700 leading-normal italic">
                    “Introduce yourself to your supervisor with your name and role”
                  </p>
                </div>

                {/* Subheading / Status */}
                <div className="text-center py-2.5">
                  <span className="text-[10px] font-bold text-indigo-700 uppercase bg-indigo-50 border border-indigo-100 px-3 py-1 rounded-full block">
                    ⚡ First Responder Active! Tap Score Grade
                  </span>
                </div>

                {/* ACTIVE LIVE BUTTONS INNER SIMULATION */}
                <div className="space-y-3">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block text-center">
                    Simulated Response Grid:
                  </span>
                  
                  {/* Dynamic Button grid rendered inside screen mockup */}
                  <div className="grid grid-cols-2 gap-2 max-h-[160px] overflow-y-auto p-1 bg-slate-200/40 rounded-xl border border-slate-200/60">
                    {performanceParams.map(param => {
                      const isSelected = mockSelectedParam?.id === param.id;
                      return (
                        <button
                          key={param.id}
                          type="button"
                          onClick={() => setMockSelectedParam(param)}
                          className={`p-2.5 rounded-xl text-white font-bold text-xs transition-all flex flex-col items-center justify-center relative cursor-pointer ${
                            isSelected ? 'ring-2 ring-slate-900 scale-[1.02] shadow-xs' : 'opacity-90 hover:opacity-100 shadow-3xs'
                          }`}
                          style={{ backgroundColor: param.color_hex }}
                        >
                          <span className="text-[11px] block">{param.label}</span>
                          <span className="text-[8px] font-normal opacity-85 block mt-0.5">Y = {param.performance_y}</span>
                          
                          {isSelected && (
                            <span className="absolute top-1 right-1 w-2 h-2 bg-white rounded-full flex items-center justify-center">
                              <span className="w-1 h-1 bg-slate-900 rounded-full" />
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Simulated Formulas preview on button press */}
                <div className="mt-4 bg-slate-900 text-slate-200 p-3 rounded-xl border border-slate-800 text-[10px] space-y-1.5 font-mono">
                  <div className="text-[9px] font-bold text-indigo-400 uppercase tracking-wider border-b border-slate-800 pb-1">
                    实时公式 / Real-Time Calculation Logic
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Y Performance Option:</span>
                    <strong className="text-white font-bold">{mockSelectedParam ? `${mockSelectedParam.label} (Y=${mockSelectedParam.performance_y})` : 'None'}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">CCI Standard X:</span>
                    <strong className="text-white font-bold">X = {mockCciX}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">CVR Multiplier:</span>
                    <strong className="text-white font-bold">Ω = {mockCvrValue}</strong>
                  </div>
                  <div className="flex justify-between text-amber-300 font-bold border-t border-slate-800/80 pt-1 mt-1">
                    <span>CCI Accuracy:</span>
                    <span>Y * X = {calcMockCciResult()} A</span>
                  </div>
                  <div className="flex justify-between text-emerald-400 font-bold">
                    <span>Final CPD Score:</span>
                    <span>CCI * CVR = {calcMockCpdResult()}</span>
                  </div>
                </div>

              </div>
            </div>

            {/* Calibrator Controller for Interactive Mockup */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-3xs space-y-3.5 text-xs">
              <h4 className="font-bold text-slate-800 flex items-center gap-1.5">
                <Info className="w-4 h-4 text-indigo-500" />
                Preview Calibration Settings
              </h4>
              <p className="text-[11px] text-slate-500 leading-normal">
                Tweak mock classroom parameters to verify that dynamic scoring calculates perfectly based on standard card and CVR values.
              </p>

              <div className="space-y-2.5">
                <div>
                  <div className="flex justify-between font-bold text-slate-600 mb-1">
                    <span>Selected Standard X Bench:</span>
                    <span className="text-red-600 font-mono">X = {mockCciX}</span>
                  </div>
                  <input 
                    type="range"
                    min={5}
                    max={50}
                    step={5}
                    value={mockCciX}
                    onChange={(e) => setMockCciX(Number(e.target.value))}
                    className="w-full accent-red-600 h-1 bg-slate-100 rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between font-bold text-slate-600 mb-1">
                    <span>Active CVR Prompt Complexity:</span>
                    <span className="text-indigo-600 font-mono">Ω = {mockCvrValue}</span>
                  </div>
                  <input 
                    type="range"
                    min={0.5}
                    max={3.0}
                    step={0.1}
                    value={mockCvrValue}
                    onChange={(e) => setMockCvrValue(Number(e.target.value))}
                    className="w-full accent-indigo-600 h-1 bg-slate-100 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
              </div>
            </div>

          </div>

        </div>
      )}

    </div>
  );
}
