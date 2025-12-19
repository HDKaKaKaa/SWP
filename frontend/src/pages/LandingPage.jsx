import React, { useEffect, useState, useContext, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import '../css/LandingPage.css';
import { Pagination, Rate, Skeleton } from 'antd';
import { motion, AnimatePresence } from 'framer-motion'; // Thư viện animation
import {
  FaSearch,
  FaMapMarkerAlt,
  FaUtensils,
  FaStar,
  FaFire,
  FaLeaf,
} from 'react-icons/fa';

const LandingPage = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [restaurants, setRestaurants] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const pageSize = 8;

  // --- API CALLS ---
  const fetchRestaurants = useCallback(async (searchKey = '', page = 1) => {
    setLoading(true);
    try {
      const res = await axios.get(`http://localhost:8080/api/restaurants`, {
        params: {
          keyword: searchKey,
          page: page - 1,
          size: pageSize,
        },
      });
      setRestaurants(res.data.content);
      setTotalItems(res.data.totalElements);
      setCurrentPage(page);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRestaurants('', 1);
    axios
      .get('http://localhost:8080/api/categories')
      .then((res) => setCategories(res.data))
      .catch((err) => console.error(err));
  }, [fetchRestaurants]);

  // --- HANDLERS ---
  const handleSearch = (e) => {
    e.preventDefault();
    setActiveCategory('All');
    fetchRestaurants(keyword, 1);
  };

  const handleFilterCategory = (catName) => {
    setKeyword('');
    setActiveCategory(catName);
    fetchRestaurants(catName, 1);
  };

  const handleRestaurantClick = (restaurant) => {
    if (!user) {
      navigate('/login');
      return;
    }

    if (user.id === restaurant.ownerAccountId) {
      navigate('/owner/dashboard');
    } else {
      navigate(`/restaurant/${restaurant.id}`);
    }
  };

  // --- RENDER ---
  return (
    <div className="landing-page-modern">
      {/* 1. HERO SECTION */}
      <section className="hero-section-modern">
        <div className="hero-bg">
          <img
            src="https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=2070&auto=format&fit=crop"
            alt="Food Banner"
            className="hero-img"
          />
          <div className="hero-overlay"></div>
        </div>

        <div className="hero-content">
          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            Hôm nay bạn muốn ăn gì?
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.6 }}
          >
            Khám phá hàng ngàn quán ăn ngon & ưu đãi hấp dẫn
          </motion.p>

          {/* Search Box */}
          <motion.form
            className="modern-search-box"
            onSubmit={handleSearch}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <input
              type="text"
              placeholder="Tìm tên quán, món ăn..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />
            <button type="submit">
              <FaSearch /> Tìm kiếm
            </button>
          </motion.form>

          {/* Category Pills */}
          <motion.div
            className="category-pills"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
          >
            <button
              className={`pill ${activeCategory === 'All' ? 'active' : ''}`}
              onClick={() => {
                setActiveCategory('All');
                fetchRestaurants('', 1);
              }}
            >
              <FaUtensils /> Tất cả
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                className={`pill ${
                  activeCategory === cat.name ? 'active' : ''
                }`}
                onClick={() => handleFilterCategory(cat.name)}
              >
                {cat.name}
              </button>
            ))}
          </motion.div>
        </div>
      </section>

      {/* 2. BODY CONTENT */}
      <div className="container-modern">
        {/* Why Choose Us (Giống mẫu) */}
        <section className="features-section">
          <div className="feature-item">
            <div className="feature-icon orange">
              <FaFire />
            </div>
            <h3>Ưu đãi mỗi ngày</h3>
            <p>Giảm giá lên đến 50% cho các quán ăn đối tác.</p>
          </div>
          <div className="feature-item">
            <div className="feature-icon green">
              <FaLeaf />
            </div>
            <h3>Thực phẩm sạch</h3>
            <p>Đảm bảo vệ sinh an toàn thực phẩm 100%.</p>
          </div>
          <div className="feature-item">
            <div className="feature-icon blue">
              <FaMapMarkerAlt />
            </div>
            <h3>Giao hàng nhanh</h3>
            <p>Tìm quán gần bạn nhất, giao trong 30 phút.</p>
          </div>
        </section>

        {/* Restaurant List Header */}
        <div className="section-header-modern">
          <h2>
            {activeCategory === 'All'
              ? 'Quán ngon phải thử'
              : `Danh mục: ${activeCategory}`}
          </h2>
          <p>Danh sách các quán ăn được đánh giá cao nhất</p>
        </div>

        {/* Restaurant Grid */}
        {loading ? (
          <div className="grid-modern">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <Skeleton.Image
                key={i}
                active
                style={{ width: '100%', height: 250, borderRadius: 20 }}
              />
            ))}
          </div>
        ) : (
          <>
            <motion.div
              className="grid-modern"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              {restaurants.length === 0 ? (
                <div className="no-result">Không tìm thấy quán nào...</div>
              ) : (
                restaurants.map((res) => (
                  <RestaurantCard
                    key={res.id}
                    data={res}
                    onClick={() => handleRestaurantClick(res)}
                  />
                ))
              )}
            </motion.div>

            {/* Pagination */}
            {totalItems > 0 && (
              <div className="pagination-wrapper">
                <Pagination
                  current={currentPage}
                  pageSize={pageSize}
                  total={totalItems}
                  onChange={(page) =>
                    fetchRestaurants(
                      keyword ||
                        (activeCategory !== 'All' ? activeCategory : ''),
                      page
                    )
                  }
                  showSizeChanger={false}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

// --- SUB COMPONENTS ---

const RestaurantCard = ({ data, onClick }) => {
  return (
    <motion.div
      className="restaurant-card-modern"
      onClick={onClick}
      whileHover={{ y: -10 }} // Hiệu ứng nhấc lên khi hover
      transition={{ type: 'spring', stiffness: 300 }}
    >
      <div className="card-image-wrapper">
        <img
          src={data.coverImage || 'https://via.placeholder.com/400x300'}
          alt={data.name}
          onError={(e) => {
            e.target.src = 'https://via.placeholder.com/400x300?text=No+Image';
          }}
        />
        <div className="card-badge">Yêu thích</div>
        <div className="card-overlay"></div>
      </div>

      <div className="card-content">
        <h3 className="card-title">{data.name}</h3>
        <p className="card-address">
          <FaMapMarkerAlt /> {data.address}
        </p>

        <div className="card-footer">
          <div className="card-rating">
            <FaStar className="star-icon" />
            <span>
              {data.averageRating ? data.averageRating.toFixed(1) : 'New'}
            </span>
            <span className="review-count">({data.totalReviews || 0})</span>
          </div>
          <button className="card-btn">Xem ngay</button>
        </div>
      </div>
    </motion.div>
  );
};

export default LandingPage;
