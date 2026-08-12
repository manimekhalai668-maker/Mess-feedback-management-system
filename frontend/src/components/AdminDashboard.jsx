import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, AreaChart, Area, ScatterChart, Scatter, ZAxis
} from 'recharts';
import {
  TrendingUp, Users, Calendar, Percent, Award, AlertOctagon, Star, CheckCircle,
  PlusCircle, RefreshCw, MessageCircle, Info, CalendarClock, ShieldAlert,
  Coffee, Utensils, Moon
} from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function AdminDashboard() {
  const [activeSubTab, setActiveSubTab] = useState('analytics'); // analytics, menu-planner, feedbacks
  const [summary, setSummary] = useState({
    avgRating: 0,
    totalResponses: 0,
    wastagePercent: 0,
    bestDish: { dish_names: 'N/A', avg_rating: 0 },
    worstDish: { dish_names: 'N/A', avg_rating: 0 }
  });
  const [dishRatings, setDishRatings] = useState([]);
  const [wastageByDay, setWastageByDay] = useState([]);
  const [ratingTrend, setRatingTrend] = useState([]);
  const [attendanceCorr, setAttendanceCorr] = useState([]);
  
  // Menu Planner States
  const [selectedDate, setSelectedDate] = useState(new Date().toLocaleDateString('en-CA'));
  const [selectedDateMenu, setSelectedDateMenu] = useState([]);
  const [menuInputs, setMenuInputs] = useState({ breakfast: '', lunch: '', dinner: '' });
  const [menuSaveStatus, setMenuSaveStatus] = useState({ msg: '', isError: false });
  const [savingMenu, setSavingMenu] = useState(false);

  // Feedback Log States
  const [selectedLogMenuId, setSelectedLogMenuId] = useState('');
  const [menuFeedbacks, setMenuFeedbacks] = useState([]);
  const [loadingFeedbacks, setLoadingFeedbacks] = useState(false);

  useEffect(() => {
    fetchAnalyticsData();
  }, []);

  useEffect(() => {
    fetchMenuForDate();
  }, [selectedDate]);

  useEffect(() => {
    if (selectedLogMenuId) {
      fetchFeedbacksForMenu(selectedLogMenuId);
    } else {
      setMenuFeedbacks([]);
    }
  }, [selectedLogMenuId]);

  const fetchAnalyticsData = async () => {
    try {
      const [resSum, resDish, resWastage, resTrend, resCorr] = await Promise.all([
        fetch(`${API_BASE_URL}/analytics/summary`),
        fetch(`${API_BASE_URL}/analytics/dish-ratings`),
        fetch(`${API_BASE_URL}/analytics/wastage-by-day`),
        fetch(`${API_BASE_URL}/analytics/rating-trend`),
        fetch(`${API_BASE_URL}/analytics/attendance-correlation`)
      ]);

      if (resSum.ok) setSummary(await resSum.json());
      if (resDish.ok) setDishRatings(await resDish.json());
      if (resWastage.ok) setWastageByDay(await resWastage.json());
      if (resTrend.ok) setRatingTrend(await resTrend.json());
      if (resCorr.ok) setAttendanceCorr(await resCorr.json());
    } catch (err) {
      console.error('Error fetching analytics:', err);
    }
  };

  const fetchMenuForDate = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/menu?date=${selectedDate}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedDateMenu(data.meals);
        
        // Map to inputs
        const inputs = { breakfast: '', lunch: '', dinner: '' };
        data.meals.forEach(m => {
          inputs[m.meal_type] = m.dish_names;
        });
        setMenuInputs(inputs);
      }
    } catch (err) {
      console.error('Error fetching menu for date:', err);
    }
  };

  const handleMenuInputChange = (mealType, value) => {
    setMenuInputs(prev => ({ ...prev, [mealType]: value }));
  };

  const handleSaveMenu = async (e) => {
    e.preventDefault();
    setSavingMenu(true);
    setMenuSaveStatus({ msg: '', isError: false });

    try {
      // Save all three meals
      const savePromises = Object.entries(menuInputs).map(async ([mealType, dishNames]) => {
        if (!dishNames.trim()) return Promise.resolve(); // Skip empty insertions
        
        const res = await fetch(`${API_BASE_URL}/menu`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            date: selectedDate,
            meal_type: mealType,
            dish_names: dishNames.trim()
          })
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || `Failed to save ${mealType}`);
        }
        return res.json();
      });

      await Promise.all(savePromises);
      setMenuSaveStatus({ msg: 'Menu saved successfully!', isError: false });
      fetchMenuForDate();
      fetchAnalyticsData(); // Refresh analytics in case best/worst dishes change
    } catch (err) {
      setMenuSaveStatus({ msg: err.message || 'Failed to save menu.', isError: true });
    } finally {
      setSavingMenu(false);
    }
  };

  const fetchFeedbacksForMenu = async (menuId) => {
    setLoadingFeedbacks(true);
    try {
      const res = await fetch(`${API_BASE_URL}/feedback/menu/${menuId}`);
      if (res.ok) {
        setMenuFeedbacks(await res.json());
      }
    } catch (err) {
      console.error('Error fetching feedbacks:', err);
    } finally {
      setLoadingFeedbacks(false);
    }
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border-glass)',
          padding: '0.75rem 1rem',
          borderRadius: 'var(--radius-sm)',
          boxShadow: 'var(--shadow-md)'
        }}>
          <p style={{ fontWeight: 'bold', margin: 0, fontSize: '0.9rem' }}>{label}</p>
          {payload.map((p, idx) => (
            <p key={idx} style={{ color: p.color || 'var(--text-secondary)', margin: '0.2rem 0', fontSize: '0.85rem' }}>
              {p.name}: {typeof p.value === 'number' ? p.value.toFixed(2) : p.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const ScatterTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div style={{
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border-glass)',
          padding: '0.75rem 1rem',
          borderRadius: 'var(--radius-sm)',
          boxShadow: 'var(--shadow-md)',
          maxWidth: '300px'
        }}>
          <p style={{ fontWeight: 'bold', margin: 0, fontSize: '0.9rem', color: 'var(--accent-primary)', textTransform: 'capitalize' }}>
            {data.meal_type} ({data.date})
          </p>
          <p style={{ fontWeight: '600', margin: '0.2rem 0 0.4rem', fontSize: '0.85rem', color: 'var(--text-primary)' }}>
            {data.dish_names}
          </p>
          <p style={{ margin: '0.1rem 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Average Rating: <strong>{data.avg_rating} ⭐</strong>
          </p>
          <p style={{ margin: '0.1rem 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Responses: <strong>{data.response_count} students</strong>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div>
      <div className="admin-tabs">
        <button
          className={`admin-tab-btn ${activeSubTab === 'analytics' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('analytics')}
        >
          Analytics Dashboard
        </button>
        <button
          className={`admin-tab-btn ${activeSubTab === 'menu-planner' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('menu-planner')}
        >
          Menu Manager & Editor
        </button>
        <button
          className={`admin-tab-btn ${activeSubTab === 'feedbacks' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('feedbacks')}
        >
          Student Feedback Logs
        </button>
      </div>

      {activeSubTab === 'analytics' && (
        <div>
          {/* KPI Card Grid */}
          <div className="kpi-row">
            <div className="kpi-card blue">
              <div className="kpi-header">
                <span className="kpi-title">Average Rating</span>
                <span className="kpi-icon-wrapper" style={{ color: 'var(--accent-primary)' }}><TrendingUp size={18} /></span>
              </div>
              <div className="kpi-value">{summary.avgRating} <span style={{ fontSize: '1rem', color: '#fbbf24' }}>⭐</span></div>
              <span className="kpi-subtext">Overall satisfaction rate</span>
            </div>

            <div className="kpi-card indigo">
              <div className="kpi-header">
                <span className="kpi-title">Total Feedback</span>
                <span className="kpi-icon-wrapper" style={{ color: 'var(--accent-secondary)' }}><Users size={18} /></span>
              </div>
              <div className="kpi-value">{summary.totalResponses}</div>
              <span className="kpi-subtext">Total student responses</span>
            </div>

            <div className="kpi-card red">
              <div className="kpi-header">
                <span className="kpi-title">Meals with Wastage</span>
                <span className="kpi-icon-wrapper" style={{ color: 'var(--danger)' }}><Percent size={18} /></span>
              </div>
              <div className="kpi-value">{summary.wastagePercent}%</div>
              <span className="kpi-subtext">Reported 'some' or 'a lot'</span>
            </div>

            <div className="kpi-card green">
              <div className="kpi-header">
                <span className="kpi-title">Best Rated Dish</span>
                <span className="kpi-icon-wrapper" style={{ color: 'var(--success)' }}><Award size={18} /></span>
              </div>
              <div className="kpi-value" style={{ fontSize: '1.2rem', padding: '0.45rem 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={summary.bestDish.dish_names}>
                {summary.bestDish.dish_names}
              </div>
              <span className="kpi-subtext">Rating: {summary.bestDish.avg_rating ? summary.bestDish.avg_rating.toFixed(2) : 0} ⭐</span>
            </div>

            <div className="kpi-card orange">
              <div className="kpi-header">
                <span className="kpi-title">Worst Rated Dish</span>
                <span className="kpi-icon-wrapper" style={{ color: 'var(--warning)' }}><AlertOctagon size={18} /></span>
              </div>
              <div className="kpi-value" style={{ fontSize: '1.2rem', padding: '0.45rem 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={summary.worstDish.dish_names}>
                {summary.worstDish.dish_names}
              </div>
              <span className="kpi-subtext">Rating: {summary.worstDish.avg_rating ? summary.worstDish.avg_rating.toFixed(2) : 0} ⭐</span>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.5rem' }}>
            <button className="logout-btn" style={{ borderColor: 'var(--border-glass)', color: 'var(--text-primary)' }} onClick={fetchAnalyticsData}>
              <RefreshCw size={14} /> Refresh Analytics
            </button>
          </div>

          {/* Recharts Plots */}
          <div className="charts-grid">
            {/* 2. Stacked Bar Chart: Wastage Level by Day of Week */}
            <div className="glass-card chart-card" style={{ gridColumn: 'span 2' }}>
              <h3 className="chart-title">Wastage Levels by Weekday</h3>
              <div className="chart-container">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={wastageByDay}
                    margin={{ top: 10, right: 30, left: 10, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="day_name" stroke="var(--text-muted)" />
                    <YAxis stroke="var(--text-muted)" />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Bar dataKey="none" name="No Wastage" stackId="a" fill="#10b981" />
                    <Bar dataKey="some" name="Some Wastage" stackId="a" fill="#f59e0b" />
                    <Bar dataKey="a_lot" name="High Wastage" stackId="a" fill="#ef4444" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* 4. Scatter Chart: Response count vs Rating */}
            <div className="glass-card chart-card" style={{ gridColumn: 'span 2' }}>
              <h3 className="chart-title">Rating vs Response Counts (Per Meal Slot)</h3>
              <div className="chart-container">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart
                    margin={{ top: 20, right: 30, bottom: 20, left: 10 }}
                  >
                    <CartesianGrid stroke="rgba(255,255,255,0.05)" />
                    <XAxis type="number" dataKey="response_count" name="Response Count" stroke="var(--text-muted)" label={{ value: 'Response Count (Students)', position: 'insideBottom', offset: -10, fill: 'var(--text-muted)' }} />
                    <YAxis type="number" dataKey="avg_rating" name="Avg Rating" domain={[1, 5]} stroke="var(--text-muted)" label={{ value: 'Average Rating', angle: -90, position: 'insideLeft', offset: 0, fill: 'var(--text-muted)' }} />
                    <ZAxis type="number" range={[60, 400]} />
                    <Tooltip content={<ScatterTooltip />} cursor={{ strokeDasharray: '3 3' }} />
                    <Legend />
                    <Scatter name="Meal Slot" data={attendanceCorr} fill="#3b82f6" shape="circle" />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'menu-planner' && (
        <div className="glass-card">
          <div className="menu-planner-layout">
            <div className="date-picker-section">
              <h3 className="editor-meal-title"><CalendarClock size={20} /> Select Date</h3>
              <div className="form-group">
                <input
                  type="date"
                  className="form-input"
                  style={{ paddingLeft: '1rem' }}
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                />
              </div>

              <div style={{ marginTop: '1.5rem' }}>
                <h4 style={{ fontSize: '1rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>Current Schedule</h4>
                {selectedDateMenu.length === 0 ? (
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                    No meals scheduled for this day yet.
                  </p>
                ) : (
                  <div className="menu-list-compact">
                    {selectedDateMenu.map((m) => (
                      <div key={m.id} className={`menu-compact-item ${m.meal_type}`}>
                        <div className="menu-compact-type">{m.meal_type}</div>
                        <div className="menu-compact-dish">{m.dish_names}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <form onSubmit={handleSaveMenu} className="menu-editor-section">
              <h3 style={{ fontSize: '1.5rem', borderBottom: '1px solid var(--border-glass)', paddingBottom: '0.5rem' }}>
                Edit Menu for {selectedDate}
              </h3>
              
              <div className="menu-form-row">
                {/* Breakfast Card */}
                <div className="glass-card menu-editor-card">
                  <h4 className="editor-meal-title"><Coffee size={18} className="text-blue-400" /> Breakfast Menu</h4>
                  <div className="form-group" style={{ margin: 0 }}>
                    <textarea
                      className="form-textarea"
                      placeholder="e.g. Masala Dosa, Chutney, Tea"
                      value={menuInputs.breakfast}
                      onChange={(e) => handleMenuInputChange('breakfast', e.target.value)}
                    />
                  </div>
                </div>

                {/* Lunch Card */}
                <div className="glass-card menu-editor-card">
                  <h4 className="editor-meal-title"><Utensils size={18} className="text-indigo-400" /> Lunch Menu</h4>
                  <div className="form-group" style={{ margin: 0 }}>
                    <textarea
                      className="form-textarea"
                      placeholder="e.g. Rice, Dal, Veg Curry, Curd"
                      value={menuInputs.lunch}
                      onChange={(e) => handleMenuInputChange('lunch', e.target.value)}
                    />
                  </div>
                </div>

                {/* Dinner Card */}
                <div className="glass-card menu-editor-card">
                  <h4 className="editor-meal-title"><Moon size={18} className="text-amber-400" /> Dinner Menu</h4>
                  <div className="form-group" style={{ margin: 0 }}>
                    <textarea
                      className="form-textarea"
                      placeholder="e.g. Roti, Paneer Butter Masala, Rice"
                      value={menuInputs.dinner}
                      onChange={(e) => handleMenuInputChange('dinner', e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {menuSaveStatus.msg && (
                <div className={menuSaveStatus.isError ? 'alert-error' : 'notification-banner'} style={{ margin: 0 }}>
                  {menuSaveStatus.isError ? <ShieldAlert size={16} /> : <CheckCircle size={16} />}
                  <span>{menuSaveStatus.msg}</span>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ width: 'auto', padding: '0.75rem 2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                  disabled={savingMenu}
                >
                  <PlusCircle size={18} />
                  {savingMenu ? 'Saving Menu...' : 'Publish / Update Menu'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {activeSubTab === 'feedbacks' && (
        <div className="glass-card feedback-log-layout">
          <div className="log-filter-row">
            <div className="form-group" style={{ margin: 0, minWidth: '200px' }}>
              <label>Select Date</label>
              <input
                type="date"
                className="form-input"
                style={{ paddingLeft: '1rem' }}
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>

            <div className="form-group" style={{ margin: 0, minWidth: '250px' }}>
              <label htmlFor="log-menu-id">Select Meal Slot</label>
              <select
                id="log-menu-id"
                className="form-select"
                value={selectedLogMenuId}
                onChange={(e) => setSelectedLogMenuId(e.target.value)}
              >
                <option value="">-- Choose Meal --</option>
                {selectedDateMenu.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.meal_type.toUpperCase()} : {m.dish_names.substring(0, 30)}...
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ marginTop: '1.5rem' }}>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <MessageCircle size={20} className="text-indigo-400" />
              Feedbacks Listing
            </h3>

            {loadingFeedbacks ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                Fetching feedbacks log...
              </div>
            ) : !selectedLogMenuId ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)', border: '1px dashed var(--border-glass)', borderRadius: 'var(--radius-sm)' }}>
                <Info size={32} style={{ marginBottom: '0.5rem' }} />
                <p>Please select a date and then choose a meal slot above to inspect feedbacks.</p>
              </div>
            ) : menuFeedbacks.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center', padding: '2rem' }}>
                No feedback submitted by students for this meal slot yet.
              </p>
            ) : (
              <div className="feedbacks-table-wrapper">
                <table className="feedbacks-table">
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Room / Roll No</th>
                      <th>Rating</th>
                      <th>Wastage Level</th>
                      <th>Comment</th>
                      <th>Submitted At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {menuFeedbacks.map((fb) => (
                      <tr key={fb.id}>
                        <td style={{ fontWeight: '600' }}>{fb.name}</td>
                        <td style={{ color: 'var(--text-secondary)' }}>
                          Room {fb.room_no} <br />
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{fb.roll_no}</span>
                        </td>
                        <td>
                          <span className="rating-badge">
                            <Star size={12} fill="#fbbf24" stroke="none" />
                            {fb.rating}
                          </span>
                        </td>
                        <td>
                          <span className={`wastage-badge ${fb.wastage_level}`}>
                            {fb.wastage_level.replace('_', ' ')}
                          </span>
                        </td>
                        <td style={{ maxWidth: '300px', wordBreak: 'break-word', color: fb.comment ? 'var(--text-primary)' : 'var(--text-muted)', fontStyle: fb.comment ? 'normal' : 'italic' }}>
                          {fb.comment ? `"${fb.comment}"` : 'No comment provided'}
                        </td>
                        <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                          {new Date(fb.submitted_at).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
