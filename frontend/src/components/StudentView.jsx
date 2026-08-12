import React, { useState, useEffect } from 'react';
import { Star, Coffee, Utensils, Moon, CheckCircle, AlertTriangle, MessageSquare, Trash2 } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function StudentView({ student, onLogout }) {
  const [todayMenu, setTodayMenu] = useState({ date: '', meals: [] });
  const [feedbacks, setFeedbacks] = useState({}); // key: menuId, val: feedback object if submitted by this student
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Form states for each meal slot
  const [formStates, setFormStates] = useState({}); // key: menuId, val: { rating, wastage_level, comment, isSubmitting, statusMsg, isError }

  useEffect(() => {
    fetchTodayData();
  }, [student.id]);

  const fetchTodayData = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch today's menu
      const resMenu = await fetch(`${API_BASE_URL}/menu/today`);
      if (!resMenu.ok) throw new Error('Failed to fetch today\'s menu');
      const menuData = await resMenu.json();
      setTodayMenu(menuData);

      // 2. Fetch feedback for each menu item to see if student already rated it
      const feedbackMap = {};
      const initialForms = {};

      for (const meal of menuData.meals) {
        const resFb = await fetch(`${API_BASE_URL}/feedback/menu/${meal.id}`);
        if (resFb.ok) {
          const fbList = await resFb.json();
          const studentFb = fbList.find(f => f.student_id === student.id);
          if (studentFb) {
            feedbackMap[meal.id] = studentFb;
          }
        }
        
        // Initialize form states
        initialForms[meal.id] = {
          rating: 0,
          wastage_level: 'none',
          comment: '',
          isSubmitting: false,
          statusMsg: '',
          isError: false
        };
      }

      setFeedbacks(feedbackMap);
      setFormStates(initialForms);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Error loading today\'s menu.');
    } finally {
      setLoading(false);
    }
  };

  const handleRatingChange = (menuId, rating) => {
    setFormStates(prev => ({
      ...prev,
      [menuId]: { ...prev[menuId], rating }
    }));
  };

  const handleWastageChange = (menuId, wastage_level) => {
    setFormStates(prev => ({
      ...prev,
      [menuId]: { ...prev[menuId], wastage_level }
    }));
  };

  const handleCommentChange = (menuId, comment) => {
    setFormStates(prev => ({
      ...prev,
      [menuId]: { ...prev[menuId], comment }
    }));
  };

  const handleSubmitFeedback = async (e, menuId) => {
    e.preventDefault();
    const form = formStates[menuId];

    if (form.rating === 0) {
      setFormStates(prev => ({
        ...prev,
        [menuId]: { ...prev[menuId], statusMsg: 'Please select a star rating.', isError: true }
      }));
      return;
    }

    setFormStates(prev => ({
      ...prev,
      [menuId]: { ...prev[menuId], isSubmitting: true, statusMsg: '', isError: false }
    }));

    try {
      const response = await fetch(`${API_BASE_URL}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: student.id,
          menu_id: menuId,
          rating: form.rating,
          wastage_level: form.wastage_level,
          comment: form.comment
        })
      });

      const data = await response.json();

      if (response.status === 409) {
        setFormStates(prev => ({
          ...prev,
          [menuId]: {
            ...prev[menuId],
            isSubmitting: false,
            statusMsg: 'You have already rated this meal.',
            isError: true
          }
        }));
        return;
      }

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit feedback');
      }

      // Success: update local states
      setFormStates(prev => ({
        ...prev,
        [menuId]: {
          ...prev[menuId],
          isSubmitting: false,
          statusMsg: 'Feedback submitted successfully!',
          isError: false
        }
      }));

      // Fetch feedback again to reflect completed state
      const resFb = await fetch(`${API_BASE_URL}/feedback/menu/${menuId}`);
      if (resFb.ok) {
        const fbList = await resFb.json();
        const studentFb = fbList.find(f => f.student_id === student.id);
        if (studentFb) {
          setFeedbacks(prev => ({ ...prev, [menuId]: studentFb }));
        }
      }
    } catch (err) {
      setFormStates(prev => ({
        ...prev,
        [menuId]: {
          ...prev[menuId],
          isSubmitting: false,
          statusMsg: err.message || 'Error submitting feedback. Please try again.',
          isError: true
        }
      }));
    }
  };

  const getMealIcon = (mealType) => {
    switch (mealType) {
      case 'breakfast': return <Coffee className="text-blue-400" size={20} />;
      case 'lunch': return <Utensils className="text-indigo-400" size={20} />;
      case 'dinner': return <Moon className="text-amber-400" size={20} />;
      default: return <Utensils size={20} />;
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem' }}>
        <div style={{ color: 'var(--text-secondary)' }}>Loading today's mess menu...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="student-section-header">
        <h2>Mess Feedback Panel</h2>
        <p>Submit your rating for today's meals to help the mess committee improve the menu.</p>
      </div>

      {error && (
        <div className="alert-error">
          <AlertTriangle size={20} />
          <span>{error}</span>
        </div>
      )}

      {todayMenu.meals.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '3rem' }}>
          <AlertTriangle size={48} style={{ color: 'var(--warning)', marginBottom: '1rem' }} />
          <h3>No Menu Posted for Today</h3>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
            The mess admin hasn't published the menu for {todayMenu.date || new Date().toLocaleDateString('en-CA')}.
          </p>
        </div>
      ) : (
        <div className="meal-cards-grid">
          {todayMenu.meals.map((meal) => {
            const isRated = !!feedbacks[meal.id];
            const ratedData = feedbacks[meal.id];
            const form = formStates[meal.id] || {};

            return (
              <div key={meal.id} className="glass-card meal-card">
                <div className="meal-header">
                  <span className="meal-type-title">
                    {getMealIcon(meal.meal_type)}
                    {meal.meal_type}
                  </span>
                  <span className={`meal-status-badge ${isRated ? 'completed' : 'pending'}`}>
                    {isRated ? 'Rated' : 'Pending'}
                  </span>
                </div>

                <div className="dish-names-display">
                  {meal.dish_names}
                </div>

                {isRated ? (
                  <div className="submitted-feedback-card">
                    <div className="submitted-row">
                      <span className="submitted-label">Rating:</span>
                      <span className="submitted-val rating-badge">
                        <Star size={14} fill="#fbbf24" stroke="none" />
                        {ratedData.rating} / 5
                      </span>
                    </div>
                    <div className="submitted-row">
                      <span className="submitted-label">Wastage reported:</span>
                      <span className={`wastage-badge ${ratedData.wastage_level}`}>
                        {ratedData.wastage_level.replace('_', ' ')}
                      </span>
                    </div>
                    {ratedData.comment && (
                      <div>
                        <span className="submitted-label" style={{ fontSize: '0.85rem' }}>Your Comment:</span>
                        <p className="submitted-comment">"{ratedData.comment}"</p>
                      </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--success)', fontSize: '0.85rem', marginTop: '0.5rem' }}>
                      <CheckCircle size={16} />
                      <span>Feedback recorded successfully</span>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={(e) => handleSubmitFeedback(e, meal.id)} className="feedback-form">
                    <div className="form-group">
                      <label>How was the meal? (Rating)</label>
                      <div className="rating-stars-container">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            className={`star-btn ${form.rating >= star ? 'active' : ''}`}
                            onClick={() => handleRatingChange(meal.id, star)}
                          >
                            <Star size={28} fill={form.rating >= star ? '#fbbf24' : 'none'} stroke="currentColor" />
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="form-group">
                      <label htmlFor={`wastage-${meal.id}`}>Food Wastage Level</label>
                      <select
                        id={`wastage-${meal.id}`}
                        className="form-select"
                        value={form.wastage_level}
                        onChange={(e) => handleWastageChange(meal.id, e.target.value)}
                      >
                        <option value="none">None (Finished full plate)</option>
                        <option value="some">Some (Left small portions)</option>
                        <option value="a_lot">A Lot (Threw away most of it)</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label htmlFor={`comment-${meal.id}`}>Optional Comment</label>
                      <textarea
                        id={`comment-${meal.id}`}
                        className="form-textarea"
                        placeholder="Add comments on taste, quality, undercooking, cold food etc."
                        value={form.comment}
                        onChange={(e) => handleCommentChange(meal.id, e.target.value)}
                      />
                    </div>

                    {form.statusMsg && (
                      <div
                        className={form.isError ? 'alert-error' : 'notification-banner'}
                        style={{ margin: 0, padding: '0.75rem' }}
                      >
                        {form.isError ? <AlertTriangle size={16} /> : <CheckCircle size={16} />}
                        <span>{form.statusMsg}</span>
                      </div>
                    )}

                    <button
                      type="submit"
                      className="btn-primary"
                      disabled={form.isSubmitting}
                      style={{ padding: '0.75rem', fontSize: '0.95rem' }}
                    >
                      {form.isSubmitting ? 'Submitting...' : 'Submit Feedback'}
                    </button>
                  </form>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
