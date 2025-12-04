import { useEffect, useState, useContext, useMemo } from 'react';
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
  const [loadingOrder, setLoadingOrder] = useState(false);

  // Load dữ liệu quán và món
  useEffect(() => {
      const fetchData = async () => {
          try {
              const [restaurantRes, productRes] = await Promise.all([
                  axios.get(`http://localhost:8080/api/restaurants/${id}`),
                  axios.get(`http://localhost:8080/api/products?restaurantId=${id}`),
              ]);
              setRestaurant(restaurantRes.data);
              setProducts(productRes.data || []);
          } catch (error) {
              console.error(error);
          }
      };

      fetchData();
  }, [id]);

  // Hàm thêm vào giỏ
    const addToCart = (product) => {
        setCart((prev) => {
            const exist = prev.find((item) => item.id === product.id);
            if (exist) {
                return prev.map((item) =>
                    item.id === product.id
                        ? { ...item, quantity: item.quantity + 1 }
                        : item
                );
            }
            return [...prev, { ...product, quantity: 1 }];
        });
    };

  // Hàm xóa khỏi giỏ
    const removeFromCart = (productId) => {
        setCart((prev) => {
            const exist = prev.find((item) => item.id === productId);
            if (!exist) return prev;

            if (exist.quantity <= 1) {
                return prev.filter((item) => item.id !== productId);
            }
            return prev.map((item) =>
                item.id === productId
                    ? { ...item, quantity: item.quantity - 1 }
                    : item
            );
        });
    };

  // Hàm tính tổng tiền
    const cartTotal = useMemo(
        () =>
            cart.reduce(
                (sum, item) => sum + (item.price || 0) * (item.quantity || 0),
                0
            ),
        [cart]
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

        const orderData = {
            accountId: user.id,
            restaurantId: id,
            address: 'Hà Nội (Địa chỉ cứng)', // TODO: Sau này lấy từ input người dùng
            items: cart.map((item) => ({
                productId: item.id,
                quantity: item.quantity,
            })),
        };

        try {
            setLoadingOrder(true);
            await axios.post('http://localhost:8080/api/orders/create', orderData);
            alert('🎉 Đặt hàng thành công!');
            setCart([]);
        } catch (err) {
            console.error(err);
            alert('Lỗi đặt hàng: ' + (err.response?.data || 'Server Error'));
        } finally {
            setLoadingOrder(false);
        }
    };

    if (!restaurant) {
        return <div className="detail-loading">Đang tải dữ liệu quán ăn...</div>;
    }

    return (
        <div className="detail-container">
            <div className="detail-wrapper">
                {/* Cột trái: Thông tin quán + menu */}
                <div className="detail-main">
                    <div className="panel res-header-info">
                        <h1 className="res-name">{restaurant.name}</h1>
                        <p className="res-address">{restaurant.address}</p>
                    </div>

                    <div className="panel menu-panel">
                        <div className="menu-header">
                            <div>
                                <h2 className="menu-title">Thực đơn hôm nay</h2>
                                <p className="menu-subtitle">
                                    Chọn món bạn thích, chúng tôi sẽ giao thật nhanh.
                                </p>
                            </div>
                            <span className="menu-count">{products.length} món</span>
                        </div>

                        {products.length === 0 && (
                            <div className="menu-empty">
                                Quán hiện chưa có món nào. Vui lòng quay lại sau.
                            </div>
                        )}

                        <div className="menu-list">
                            {products.map((p) => (
                                <div key={p.id} className="menu-item">
                                    <div className="menu-item-main">
                                        <div className="menu-item-info">
                                            <h4 className="menu-item-name">{p.name}</h4>
                                            {p.description && (
                                                <p className="menu-item-desc">{p.description}</p>
                                            )}
                                            <div className="menu-item-price">
                                                {p.price?.toLocaleString()} đ
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        className="btn-add"
                                        onClick={() => addToCart(p)}
                                    >
                                        + Thêm
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Cột phải: Giỏ hàng */}
                <aside className="detail-cart">
                    <div className="panel cart-panel">
                        <h3 className="cart-title">Giỏ hàng của bạn</h3>
                        <p className="cart-restaurant">{restaurant.name}</p>

                        {cart.length === 0 ? (
                            <p className="cart-empty">
                                Chưa có món nào trong giỏ. Hãy chọn món ở bên trái nhé!
                            </p>
                        ) : (
                            <>
                                <div className="cart-items">
                                    {cart.map((item) => (
                                        <div key={item.id} className="cart-item">
                                            <div className="cart-item-main">
                                                <span className="cart-item-name">{item.name}</span>
                                                <div className="cart-item-qty">
                                                    <button
                                                        type="button"
                                                        className="cart-qty-btn"
                                                        onClick={() => removeFromCart(item.id)}
                                                    >
                                                        -
                                                    </button>
                                                    <span>{item.quantity}</span>
                                                    <button
                                                        type="button"
                                                        className="cart-qty-btn"
                                                        onClick={() => addToCart(item)}
                                                    >
                                                        +
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="cart-item-price">
                                                {(item.price * item.quantity).toLocaleString()} đ
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="cart-summary">
                                    <span>Tổng cộng</span>
                                    <span className="cart-total">
                    {cartTotal.toLocaleString()} đ
                  </span>
                                </div>

                                <button
                                    type="button"
                                    className="btn-order"
                                    onClick={handlePlaceOrder}
                                    disabled={loadingOrder}
                                >
                                    {loadingOrder ? 'Đang xử lý...' : 'Đặt hàng ngay'}
                                </button>
                            </>
                        )}
                    </div>
                </aside>
            </div>
        </div>
    );
};

export default RestaurantDetail;
