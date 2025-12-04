import { useEffect, useState, useContext, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { FiShoppingBag, FiImage } from "react-icons/fi";
import '../css/RestaurantDetail.css';

const RestaurantDetail = () => {
    const { id } = useParams();
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();

    const [restaurant, setRestaurant] = useState(null);
    const [products, setProducts] = useState([]);
    const [addingProductId, setAddingProductId] = useState(null);

    // productId -> quantity trong giỏ
    const [cartQuantities, setCartQuantities] = useState({});
    // productId -> ảnh bị lỗi
    const [brokenImages, setBrokenImages] = useState({});
    // tổng tiền lấy từ /api/cart
    const [cartSummary, setCartSummary] = useState({
        subtotal: 0,
        shippingFee: 0,
        total: 0,
    });

    const totalCartItems = useMemo(
        () =>
            Object.values(cartQuantities).reduce(
                (sum, q) => sum + (q || 0),
                0
            ),
        [cartQuantities]
    );

    const formatPrice = (v) => {
        if (!v) return '0 đ';
        try {
            return v.toLocaleString('vi-VN') + ' đ';
        } catch {
            return `${v} đ`;
        }
    };

    // Load dữ liệu quán + menu
    useEffect(() => {
        window.scrollTo(0, 0);
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

    // Nếu user đã login thì load giỏ hàng để biết mỗi món đang có bao nhiêu + tổng tiền
    useEffect(() => {
        const fetchCart = async () => {
            if (!user) {
                setCartQuantities({});
                setCartSummary({ subtotal: 0, shippingFee: 0, total: 0 });
                return;
            }
            try {
                const res = await axios.get('http://localhost:8080/api/cart', {
                    params: { accountId: user.id },
                });
                const data = res.data;
                const qtyMap = {};
                data?.items?.forEach((item) => {
                    qtyMap[item.productId] = item.quantity;
                });
                setCartQuantities(qtyMap);
                setCartSummary({
                    subtotal: data?.subtotal || 0,
                    shippingFee: data?.shippingFee || 0,
                    total: data?.total || data?.subtotal || 0,
                });
            } catch (err) {
                console.error(err);
            }
        };

        fetchCart();
    }, [user]);

    // helper: sync lại cartQuantities & tổng tiền từ response BE
    const syncQuantitiesFromResponse = (data) => {
        const qtyMap = {};
        data?.items?.forEach((item) => {
            qtyMap[item.productId] = item.quantity;
        });
        setCartQuantities(qtyMap);
        setCartSummary({
            subtotal: data?.subtotal || 0,
            shippingFee: data?.shippingFee || 0,
            total: data?.total || data?.subtotal || 0,
        });
    };

    const handleAddToCart = async (product) => {
        if (!user) {
            alert('Bạn cần đăng nhập để đặt món.');
            navigate('/login');
            return;
        }

        try {
            setAddingProductId(product.id);
            const res = await axios.post('http://localhost:8080/api/cart/items', {
                accountId: user.id,
                restaurantId: Number(id),
                productId: product.id,
                quantity: 1,
            });

            syncQuantitiesFromResponse(res.data);
        } catch (err) {
            console.error(err);
            alert('Không thêm được món vào giỏ. Vui lòng thử lại.');
        } finally {
            setAddingProductId(null);
        }
    };

    const handleChangeQuantity = async (product, delta) => {
        if (!user) {
            navigate('/login');
            return;
        }

        const current = cartQuantities[product.id] || 0;
        const newQty = current + delta;
        if (newQty < 0) return;

        try {
            setAddingProductId(product.id);
            let res;

            if (newQty === 0) {
                res = await axios.delete(
                    `http://localhost:8080/api/cart/items/${product.id}`,
                    {
                        params: { accountId: user.id },
                    }
                );
            } else {
                res = await axios.put('http://localhost:8080/api/cart/items', {
                    accountId: user.id,
                    productId: product.id,
                    quantity: newQty,
                });
            }

            syncQuantitiesFromResponse(res.data);
        } catch (err) {
            console.error(err);
            alert('Không cập nhật được số lượng. Vui lòng thử lại.');
        } finally {
            setAddingProductId(null);
        }
    };

    const handleGoToCart = () => {
        if (!user) {
            navigate('/login');
            return;
        }
        if (totalCartItems === 0) return;
        navigate('/cart');
    };

    const handleImageError = (productId) => {
        setBrokenImages((prev) => ({ ...prev, [productId]: true }));
    };

    if (!restaurant) {
        return <div className="detail-loading">Đang tải dữ liệu quán ăn...</div>;
    }

    return (
        <div className="detail-container">
            <div className="detail-wrapper">
                {/* Cột trái: thông tin quán + menu */}
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
                            {products.map((p) => {
                                const qty = cartQuantities[p.id] || 0;
                                const showImage = p.image && !brokenImages[p.id];

                                return (
                                    <div key={p.id} className="menu-item">
                                        <div className="menu-item-main">
                                            {/* Ảnh món ăn + placeholder nếu không có / bị lỗi */}
                                            <div className="menu-item-thumb">
                                                {showImage ? (
                                                    <img
                                                        src={p.image}
                                                        alt={p.name}
                                                        onError={() => handleImageError(p.id)}
                                                        className="menu-item-thumb-img"
                                                    />
                                                ) : (
                                                    <div className="menu-item-thumb-placeholder">
                                                        <FiImage size={26} />
                                                    </div>
                                                )}
                                            </div>

                                            <div className="menu-item-info">
                                                <h4 className="menu-item-name">{p.name}</h4>
                                                {p.description && (
                                                    <p className="menu-item-desc">{p.description}</p>
                                                )}
                                                <div className="menu-item-price">
                                                    {p.price?.toLocaleString('vi-VN')} đ
                                                </div>
                                            </div>
                                        </div>

                                        <div className="menu-item-actions">
                                            {qty === 0 ? (
                                                <button
                                                    type="button"
                                                    className="btn-add-primary"
                                                    onClick={() => handleAddToCart(p)}
                                                    disabled={addingProductId === p.id}
                                                >
                                                    {addingProductId === p.id
                                                        ? 'Đang thêm...'
                                                        : '+ Thêm'}
                                                </button>
                                            ) : (
                                                <div className="menu-qty-group">
                                                    <button
                                                        type="button"
                                                        className="menu-qty-btn"
                                                        onClick={() => handleChangeQuantity(p, -1)}
                                                        disabled={addingProductId === p.id}
                                                    >
                                                        −
                                                    </button>
                                                    <span className="menu-qty-value">{qty}</span>
                                                    <button
                                                        type="button"
                                                        className="menu-qty-btn"
                                                        onClick={() => handleChangeQuantity(p, +1)}
                                                        disabled={addingProductId === p.id}
                                                    >
                                                        +
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Cột phải: mini-cart giống ShopeeFood (nhưng khác đủ nhiều) */}
                <aside className="detail-cart">
                    <div className="panel detail-cart-panel">
                        {/* Phần thân: icon + giá + note */}
                        <div className="detail-cart-body">
                            <div className="detail-cart-top">
                                <div className="detail-cart-icon-wrapper">
                    <span className="detail-cart-icon">
                        <FiShoppingBag size={22} />
                    </span>
                                    {totalCartItems > 0 && (
                                        <span className="detail-cart-badge">
                            {totalCartItems}
                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="detail-cart-prices">
                                <div className="detail-cart-row">
                                    <span>Tạm tính</span>
                                    <span className="detail-cart-subtotal">
                        {formatPrice(cartSummary.subtotal)}
                    </span>
                                </div>
                                <div className="detail-cart-row detail-cart-row-total">
                                    <span>Tổng cộng</span>
                                    <span className="detail-cart-total">
                        {formatPrice(
                            cartSummary.total || cartSummary.subtotal
                        )}
                    </span>
                                </div>
                            </div>

                            {!user && (
                                <p className="detail-cart-note">
                                    Vui lòng đăng nhập để đặt món.
                                </p>
                            )}
                        </div>

                        {/* Nút luôn nằm ở đáy card */}
                        <button
                            type="button"
                            className="detail-cart-button"
                            onClick={handleGoToCart}
                            disabled={!user || totalCartItems === 0}
                        >
                            Giao hàng
                        </button>
                    </div>
                </aside>
            </div>
        </div>
    );
};

export default RestaurantDetail;
