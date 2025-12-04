import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../css/LandingPage.css';
import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

const LandingPage = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [restaurants, setRestaurants] = useState([]);
  const [categories, setCategories] = useState([]);
  const [keyword, setKeyword] = useState('');

  const fetchRestaurants = (searchKey) => {
    const url = searchKey
      ? `http://localhost:8080/api/restaurants?keyword=${searchKey}`
      : `http://localhost:8080/api/restaurants`;

    axios
      .get(url)
      .then((res) => setRestaurants(res.data))
      .catch((err) => console.error(err));
  };

  useEffect(() => {
    fetchRestaurants('');
    axios
      .get('http://localhost:8080/api/categories')
      .then((res) => setCategories(res.data))
      .catch((err) => console.error(err));
  }, []);

  const handleSearch = () => {
    fetchRestaurants(keyword);
  };

  const handleFilterCategory = (categoryName) => {
    setKeyword(categoryName);
    fetchRestaurants(categoryName);
  };

  const handleRestaurantClick = (resId) => {
    if (user) {
      // Đã đăng nhập -> Cho vào xem chi tiết
      navigate(`/restaurant/${resId}`);
    } else {
      // Chưa đăng nhập -> Navigate sang trang Login
      alert('Bạn cần đăng nhập để xem chi tiết quán!');
      navigate('/login');
    }
  };

  return (
    <div>
      {/* BANNER & SEARCH */}
      <div className="hero-banner">
        <h1 className="hero-title">Đặt hàng nhanh chóng</h1>

        <div className="search-container">
          <input
            className="search-input"
            type="text"
            placeholder="Tìm địa điểm, món ăn, địa chỉ..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
          <button className="search-btn" onClick={handleSearch}>
            Q
          </button>
        </div>

        <div className="category-filter-container">
          <button
            className="category-pill"
            onClick={() => fetchRestaurants('')}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              className="category-pill"
              onClick={() => handleFilterCategory(cat.name)}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* RESTAURANT LIST */}
      <div className="restaurant-section">
        <div className="restaurant-grid">
          {restaurants.length === 0 ? <p>Không tìm thấy quán nào...</p> : null}

          {restaurants.map((res) => (
            <div
              key={res.id}
              className="restaurant-card"
              onClick={() => handleRestaurantClick(res.id)}
            >
              <img
                src={res.coverImage || 'https://via.placeholder.com/300x180'}
                alt={res.name}
                className="res-img"
              />
              <div className="res-info">
                <h4 className="res-name">
                  <span className="verified-icon">🛡️</span>
                  {res.name}
                </h4>
                <p className="res-address">{res.address}</p>
                <div className="res-promo">🎁 Đang có khuyến mãi</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
