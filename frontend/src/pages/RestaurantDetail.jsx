import { useEffect, useState, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import '../css/RestaurantDetail.css';

const RestaurantDetail = () => {
  const { id } = useParams();
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [restaurant, setRestaurant] = useState(null);
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);

  // Load dữ liệu quán và món
  useEffect(() => {
    axios
      .get(`http://localhost:8080/api/restaurants/${id}`)
      .then((res) => setRestaurant(res.data));
    axios
      .get(`http://localhost:8080/api/products?restaurantId=${id}`)
      .then((res) => setProducts(res.data));
  }, [id]);

  // Hàm thêm vào giỏ
  const addToCart = (product) => {
    const exist = cart.find((item) => item.id === product.id);
    if (exist) {
      setCart(
        cart.map((item) =>
          item.id === product.id
            ? { ...exist, quantity: exist.quantity + 1 }
            : item
        )
      );
    } else {
      setCart([...cart, { ...product, quantity: 1 }]);
    }
  };

  // Hàm xóa khỏi giỏ
  const removeFromCart = (productId) => {
    setCart(cart.filter((item) => item.id !== productId));
  };

  // Hàm tính tổng tiền
  const totalAmount = cart.reduce(
    (acc, item) => acc + item.price * item.quantity,
    0
  );

  // Hàm gửi đơn hàng
  const handlePlaceOrder = async () => {
    if (!user) {
      alert('Bạn chưa đăng nhập!');
      navigate('/login');
      return;
    }
    if (cart.length === 0) {
      alert('Giỏ hàng đang trống!');
      return;
    }

    // Chuẩn bị cục JSON đúng format backend yêu cầu
    const orderData = {
      accountId: user.id,
      restaurantId: id,
      address: 'Hà Nội (Địa chỉ cứng)', // Sau này lấy từ input
      items: cart.map((item) => ({
        productId: item.id,
        quantity: item.quantity,
      })),
    };

    try {
      await axios.post('http://localhost:8080/api/orders/create', orderData);
      alert('🎉 Đặt hàng thành công!');
      setCart([]);
    } catch (err) {
      console.error(err);
      alert('Lỗi đặt hàng: ' + (err.response?.data || 'Server Error'));
    }
  };

  if (!restaurant) return <div>Loading...</div>;

  return (
    <div
      className="detail-container"
      style={{ display: 'flex', gap: '20px', padding: '20px' }}
    >
      {/* THÔNG TIN & MENU */}
      <div style={{ flex: 2 }}>
        <div className="res-header-info">
          <h1>{restaurant.name}</h1>
          <p>{restaurant.address}</p>
        </div>

        <div className="menu-list" style={{ marginTop: '20px' }}>
          {products.map((p) => (
            <div
              key={p.id}
              className="menu-item"
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '10px',
                borderBottom: '1px solid #eee',
                background: 'white',
              }}
            >
              <div style={{ display: 'flex', gap: '10px' }}>
                <img
                  src={p.image || 'https://via.placeholder.com/60'}
                  width="60"
                  style={{ borderRadius: 5 }}
                />
                <div>
                  <h4>{p.name}</h4>
                  <div style={{ color: '#ee4d2d' }}>
                    {p.price.toLocaleString()}đ
                  </div>
                </div>
              </div>
              <button
                onClick={() => addToCart(p)}
                style={{
                  background: '#ee4d2d',
                  color: 'white',
                  border: 'none',
                  padding: '5px 15px',
                  borderRadius: 5,
                  cursor: 'pointer',
                }}
              >
                +
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* GIỎ HÀNG */}
      <div
        style={{
          flex: 1,
          background: 'white',
          padding: '20px',
          height: 'fit-content',
          borderRadius: 8,
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
          position: 'sticky',
          top: '20px',
        }}
      >
        <h3>Giỏ hàng ({cart.length})</h3>

        {cart.map((item) => (
          <div
            key={item.id}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: '10px',
              fontSize: '14px',
            }}
          >
            <span>
              {item.quantity}x {item.name}
            </span>
            <span>
              {(item.price * item.quantity).toLocaleString()}đ{' '}
              <b
                onClick={() => removeFromCart(item.id)}
                style={{ color: 'red', cursor: 'pointer', marginLeft: 5 }}
              >
                x
              </b>
            </span>
          </div>
        ))}

        <hr />
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontWeight: 'bold',
            fontSize: '18px',
            marginTop: '10px',
          }}
        >
          <span>Tổng cộng:</span>
          <span style={{ color: '#ee4d2d' }}>
            {totalAmount.toLocaleString()}đ
          </span>
        </div>

        <button
          onClick={handlePlaceOrder}
          style={{
            width: '100%',
            padding: '12px',
            background: '#ee4d2d',
            color: 'white',
            border: 'none',
            marginTop: '15px',
            fontWeight: 'bold',
            cursor: 'pointer',
            fontSize: '16px',
          }}
        >
          Đặt hàng ngay
        </button>
      </div>
    </div>
  );
};

export default RestaurantDetail;
