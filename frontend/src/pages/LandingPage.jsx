import { useEffect, useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import '../css/LandingPage.css';

import {
  Input,
  Button,
  Card,
  Rate,
  Badge,
  Tag,
  Row,
  Col,
  Typography,
  Skeleton,
  Carousel,
} from 'antd';
import {
  SearchOutlined,
  EnvironmentOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import { FaUtensils, FaFire } from 'react-icons/fa';

const { Title, Text } = Typography;
const { Meta } = Card;

const LandingPage = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [restaurants, setRestaurants] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');

  const fetchRestaurants = async (searchKey = '') => {
    setLoading(true);
    try {
      const url = searchKey
        ? `http://localhost:8080/api/restaurants?keyword=${searchKey}`
        : `http://localhost:8080/api/restaurants`;
      const res = await axios.get(url);
      setRestaurants(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setTimeout(() => setLoading(false), 100);
    }
  };

  useEffect(() => {
    fetchRestaurants('');
    axios
      .get('http://localhost:8080/api/categories')
      .then((res) => setCategories(res.data));
  }, []);

  const handleSearch = (value) => {
    setActiveCategory('All');
    fetchRestaurants(value);
  };

  const handleFilterCategory = (catName) => {
    setKeyword('');
    setActiveCategory(catName);
    fetchRestaurants(catName);
  };

  const handleRestaurantClick = (resId) => {
    if (user) {
      navigate(`/restaurant/${resId}`);
    } else {
      navigate('/login');
    }
  };

  const banners = [
    'https://plus.unsplash.com/premium_photo-1695411123705-3a2157d517ad?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MXx8VmlldG5hbWVzZSUyMGZvb2R8ZW58MHx8MHx8fDA%3D',
    'https://images.unsplash.com/photo-1715925717150-2a6d181d8846?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Nnx8VmlldG5hbWVzZSUyMGZvb2R8ZW58MHx8MHx8fDA%3D',
    'https://images.unsplash.com/photo-1619900950180-4a099c7aaeb1?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTF8fFZpZXRuYW1lc2UlMjBmb29kfGVufDB8fDB8fHww',
  ];

  return (
    <div className="landing-page">
      {/* 1. HERO SECTION & CAROUSEL */}
      <div className="hero-section">
        <Carousel autoplay effect="fade" className="hero-carousel">
          {banners.map((img, index) => (
            <div key={index}>
              <div
                className="banner-slide"
                style={{
                  backgroundImage: `url(${img})`,
                  height: '400px',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  position: 'relative',
                }}
              >
                <div className="overlay"></div>
              </div>
            </div>
          ))}
        </Carousel>

        <div className="hero-content">
          <Title level={1} className="hero-title">
            Hôm nay bạn muốn ăn gì?
          </Title>

          <div className="search-box-wrapper">
            <Input.Search
              placeholder="Tìm tên quán, món ăn, địa chỉ..."
              allowClear
              enterButton="Tìm kiếm"
              size="large"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onSearch={handleSearch}
              className="custom-search"
            />
          </div>

          {/* Category Filter */}
          <div className="category-list">
            <Button
              shape="round"
              className={
                activeCategory === 'All' ? 'cat-btn active' : 'cat-btn'
              }
              onClick={() => {
                setActiveCategory('All');
                fetchRestaurants('');
              }}
              icon={<FaUtensils />}
            >
              Tất cả
            </Button>
            {categories.map((cat) => (
              <Button
                key={cat.id}
                shape="round"
                className={
                  activeCategory === cat.name ? 'cat-btn active' : 'cat-btn'
                }
                onClick={() => handleFilterCategory(cat.name)}
              >
                {cat.name}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* 2. RESTAURANT LIST */}
      <div className="container-body">
        <div className="section-header">
          <Title level={3} style={{ margin: 0 }}>
            <FaFire style={{ color: '#ee4d2d', marginRight: 8 }} />
            Ưu đãi hôm nay
          </Title>
        </div>

        {loading ? (
          <Row gutter={[24, 24]}>
            {[1, 2, 3, 4].map((i) => (
              <Col xs={24} sm={12} md={8} lg={6} key={i}>
                <Card
                  cover={
                    <Skeleton.Image
                      active
                      style={{ width: '100%', height: 180 }}
                    />
                  }
                >
                  <Skeleton active paragraph={{ rows: 2 }} />
                </Card>
              </Col>
            ))}
          </Row>
        ) : (
          <Row gutter={[24, 24]}>
            {restaurants.length === 0 && (
              <Text type="secondary">Không tìm thấy quán nào...</Text>
            )}

            {restaurants.map((res) => (
              <Col xs={24} sm={12} md={8} lg={6} key={res.id}>
                {/* Badge Ribbon giống ShopeeFood */}
                <Badge.Ribbon text="Yêu thích" color="#ee4d2d">
                  <Card
                    hoverable
                    className="restaurant-card"
                    cover={
                      <div className="card-cover-wrapper">
                        <img
                          alt={res.name}
                          src={
                            res.coverImage ||
                            'https://via.placeholder.com/300x180'
                          }
                          className="card-img"
                        />
                        <div className="delivery-time">
                          <ClockCircleOutlined /> 15-20 min
                        </div>
                      </div>
                    }
                    onClick={() => handleRestaurantClick(res.id)}
                  >
                    <Meta
                      title={<div className="res-title">{res.name}</div>}
                      description={
                        <div>
                          <div className="res-address">
                            <EnvironmentOutlined /> {res.address}
                          </div>
                          <div className="res-rating">
                            <Rate
                              disabled
                              defaultValue={4.5}
                              style={{ fontSize: 12, color: '#ffce3d' }}
                            />
                            <span
                              style={{
                                fontSize: 12,
                                marginLeft: 5,
                                color: '#777',
                              }}
                            >
                              (99+)
                            </span>
                          </div>
                          <div className="res-tags">
                            <Tag color="red">Mã giảm 15k</Tag>
                            <Tag color="blue">Freeship</Tag>
                          </div>
                        </div>
                      }
                    />
                  </Card>
                </Badge.Ribbon>
              </Col>
            ))}
          </Row>
        )}
      </div>
    </div>
  );
};

export default LandingPage;
