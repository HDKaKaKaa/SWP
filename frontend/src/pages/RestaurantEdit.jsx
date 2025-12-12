import React, { useContext, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom'; // Thêm useParams để lấy ID từ URL
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import '../css/RestaurantRegistration.css'; // Dùng chung CSS với trang đăng ký
import {
  Form,
  Input,
  Button,
  Upload,
  message,
  Row,
  Col,
  Divider,
  Skeleton,
} from 'antd';
import {
  UserOutlined,
  IdcardOutlined,
  ShopOutlined,
  PhoneOutlined,
  EnvironmentOutlined,
  PlusOutlined,
  LoadingOutlined,
  DeleteOutlined,
  SaveOutlined,
} from '@ant-design/icons';
import MapModal from '../components/MapModal';

const { TextArea } = Input;

const RestaurantEdit = () => {
  const { id } = useParams(); // Lấy ID quán từ URL (ví dụ: /restaurant/edit/5)
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true); // State để hiển thị loading khi đang lấy dữ liệu cũ
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [coordinates, setCoordinates] = useState(null);

  // State quản lý ảnh
  const [fileList, setFileList] = useState([]);
  const [previewImage, setPreviewImage] = useState('');

  const [form] = Form.useForm();

  // 1. LOAD DỮ LIỆU CŨ KHI VÀO TRANG
  useEffect(() => {
    const fetchRestaurantData = async () => {
      try {
        const res = await axios.get(
          `http://localhost:8080/api/restaurants/${id}`
        );
        const data = res.data;

        // Check quyền: Nếu user hiện tại không phải chủ quán (kiểm tra accountId) -> đá ra
        // (Bạn nên check thêm ở Backend, đây là check nhanh ở FE)
        if (data.owner && data.owner.accountId !== user.id) {
          message.error('Bạn không có quyền sửa quán này!');
          navigate('/my-registrations');
          return;
        }

        // Fill dữ liệu vào Form
        form.setFieldsValue({
          restaurantName: data.name,
          address: data.address,
          phone: data.phone,
          description: data.description,
          ownerFullName: data.owner?.fullName,
          idCardNumber: data.owner?.idCardNumber,
        });

        // Set tọa độ cũ
        if (data.latitude && data.longitude) {
          setCoordinates({
            latitude: data.latitude,
            longitude: data.longitude,
          });
        }

        // Set ảnh cũ vào FileList để hiển thị
        if (data.coverImage) {
          setFileList([
            {
              uid: '-1',
              name: 'existing-image.png',
              status: 'done',
              url: data.coverImage, // Quan trọng: URL ảnh cũ
            },
          ]);
          setPreviewImage(data.coverImage);
        }
      } catch (err) {
        message.error('Không thể tải thông tin quán!');
        console.error(err);
      } finally {
        setFetching(false);
      }
    };

    if (user && id) {
      fetchRestaurantData();
    }
  }, [id, user, form, navigate]);

  // ... (Các hàm xử lý ảnh handlePreview, handleRemoveImage... giữ nguyên như trang Registration)
  const handlePreview = async (file) => {
    if (!file.url && !file.preview) {
      file.preview = await getBase64(file.originFileObj);
    }
    setPreviewImage(file.url || file.preview);
  };

  const handleRemoveImage = (e) => {
    e.stopPropagation();
    setFileList([]);
    setPreviewImage('');
  };

  const handleChange = ({ fileList: newFileList }) => setFileList(newFileList);

  const beforeUpload = (file) => {
    const isJpgOrPng = file.type === 'image/jpeg' || file.type === 'image/png';
    if (!isJpgOrPng) {
      message.error('Bạn chỉ có thể upload file JPG/PNG!');
      return Upload.LIST_IGNORE;
    }
    return false; // Return false để không auto upload
  };

  const getBase64 = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
    });

  const handleMapConfirm = async (coords) => {
    const [lat, lng] = coords;
    setCoordinates({ latitude: lat, longitude: lng });
    setIsMapOpen(false);
    // ... (Logic reverse geocoding giữ nguyên nếu muốn)
    form.setFieldsValue({
      address: `Đã chọn vị trí mới (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
    });
  };

  // 2. XỬ LÝ LƯU (UPDATE)
  const onFinish = async (values) => {
    setLoading(true);
    try {
      if (fileList.length === 0) {
        message.error('Vui lòng chọn ảnh đại diện!');
        setLoading(false);
        return;
      }

      let finalImageUrl = '';

      // TRƯỜNG HỢP 1: Người dùng giữ nguyên ảnh cũ (có thuộc tính url)
      if (fileList[0].url) {
        finalImageUrl = fileList[0].url;
      }
      // TRƯỜNG HỢP 2: Người dùng upload ảnh mới (có originFileObj)
      else if (fileList[0].originFileObj) {
        const uploadData = new FormData();
        uploadData.append('file', fileList[0].originFileObj);

        const uploadRes = await axios.post(
          'http://localhost:8080/api/upload/image', // API upload của bạn
          uploadData,
          { headers: { 'Content-Type': 'multipart/form-data' } }
        );
        finalImageUrl = uploadRes.data;
      }

      // Chuẩn bị data gửi đi (cấu trúc tùy thuộc Backend DTO)
      const updateData = {
        restaurantName: values.restaurantName,
        address: values.address,
        phone: values.phone,
        description: values.description,
        ownerFullName: values.ownerFullName,
        idCardNumber: values.idCardNumber,
        coverImageUrl: finalImageUrl,
        // Tọa độ mới hoặc cũ
        latitude: coordinates?.latitude,
        longitude: coordinates?.longitude,
      };

      // GỌI API PUT
      await axios.put(
        `http://localhost:8080/api/restaurants/${id}`,
        updateData
      );

      message.success(
        'Cập nhật thành công! Trạng thái quán đã chuyển về "Chờ duyệt".'
      );

      setTimeout(() => {
        navigate('/my-registrations');
      }, 1500);
    } catch (err) {
      console.error(err);
      message.error(err.response?.data || 'Có lỗi xảy ra khi cập nhật.');
    } finally {
      setLoading(false);
    }
  };

  if (fetching)
    return (
      <div style={{ padding: 50, textAlign: 'center' }}>
        <Skeleton active />
      </div>
    );

  return (
    <div className="res-reg-container">
      <div className="res-reg-overlay"></div>
      <div className="res-reg-card">
        <div className="res-reg-header" style={{ background: '#1890ff' }}>
          {' '}
          {/* Đổi màu header chút để phân biệt */}
          <h2>Cập nhật thông tin Quán</h2>
          <p style={{ opacity: 0.8, marginTop: 5 }}>
            Chỉnh sửa thông tin - Quán sẽ cần được duyệt lại
          </p>
        </div>

        <MapModal
          isOpen={isMapOpen}
          onClose={() => setIsMapOpen(false)}
          onConfirm={handleMapConfirm}
        />

        <div className="res-reg-body">
          <Form form={form} layout="vertical" onFinish={onFinish} size="large">
            {/* ... COPY Y NGUYÊN PHẦN FORM ITEM TỪ FILE RestaurantRegistration.jsx VÀO ĐÂY ... */}
            {/* CHÚ Ý: Copy toàn bộ nội dung bên trong <Form>...</Form> của file cũ */}
            {/* Bao gồm: Row, Col, các Form.Item (ownerFullName, idCardNumber, phone, restaurantName, address, description) */}

            {/* Tôi viết tắt phần UI Form ở đây để code đỡ dài, bạn copy paste vào nhé */}
            <Row gutter={40}>
              <Col xs={24} md={12}>
                <div className="section-title">Thông tin chủ quán</div>
                <Form.Item
                  name="ownerFullName"
                  label="Họ tên"
                  rules={[{ required: true }]}
                >
                  <Input prefix={<UserOutlined />} />
                </Form.Item>
                <Form.Item
                  name="idCardNumber"
                  label="CCCD"
                  rules={[{ required: true }]}
                >
                  <Input prefix={<IdcardOutlined />} />
                </Form.Item>
                <Form.Item
                  name="phone"
                  label="SĐT"
                  rules={[{ required: true }]}
                >
                  <Input prefix={<PhoneOutlined />} />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <div className="section-title">Thông tin quán</div>
                <Form.Item
                  name="restaurantName"
                  label="Tên quán"
                  rules={[{ required: true }]}
                >
                  <Input prefix={<ShopOutlined />} />
                </Form.Item>
                <Form.Item
                  name="address"
                  label="Địa chỉ"
                  rules={[{ required: true }]}
                >
                  <Input
                    prefix={<EnvironmentOutlined />}
                    readOnly
                    onClick={() => setIsMapOpen(true)}
                    placeholder="Chọn lại vị trí nếu muốn đổi"
                  />
                </Form.Item>
                <Form.Item name="description" label="Mô tả">
                  <TextArea rows={2} />
                </Form.Item>
              </Col>
            </Row>

            <Divider>HÌNH ẢNH</Divider>
            <Row justify="center">
              <Col span={24}>
                <Form.Item style={{ textAlign: 'center' }}>
                  <Upload
                    listType="picture-card"
                    className="avatar-uploader"
                    showUploadList={false}
                    beforeUpload={beforeUpload}
                    onChange={handleChange}
                    maxCount={1}
                  >
                    {/* Logic hiển thị ảnh preview (tương tự file cũ) */}
                    {fileList.length > 0 ? (
                      <div
                        style={{
                          position: 'relative',
                          width: '100%',
                          height: '100%',
                        }}
                      >
                        <img
                          src={previewImage || fileList[0].url}
                          alt="avatar"
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                          }}
                        />
                        <Button
                          type="primary"
                          danger
                          shape="circle"
                          icon={<DeleteOutlined />}
                          size="small"
                          onClick={handleRemoveImage}
                          style={{ position: 'absolute', top: 5, right: 5 }}
                        />
                      </div>
                    ) : (
                      <div>
                        <PlusOutlined />{' '}
                        <div style={{ marginTop: 8 }}>Tải ảnh mới</div>
                      </div>
                    )}
                  </Upload>
                </Form.Item>
              </Col>
            </Row>

            {/* NÚT SUBMIT THAY ĐỔI THÀNH LƯU */}
            <Form.Item style={{ marginTop: 20 }}>
              <Button
                type="primary"
                htmlType="submit"
                block
                loading={loading}
                icon={<SaveOutlined />}
                style={{ height: '50px', fontSize: '18px', fontWeight: 'bold' }}
              >
                LƯU THAY ĐỔI
              </Button>
            </Form.Item>
          </Form>
        </div>
      </div>
    </div>
  );
};

export default RestaurantEdit;
