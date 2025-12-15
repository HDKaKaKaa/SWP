import React, { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import '../css/RestaurantRegistration.css';
import {
  Form,
  Input,
  Button,
  Upload,
  message,
  Row,
  Col,
  Typography,
  Divider,
} from 'antd';
import {
  UserOutlined,
  IdcardOutlined,
  ShopOutlined,
  PhoneOutlined,
  HomeOutlined,
  PlusOutlined,
  LoadingOutlined,
  EnvironmentOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import MapModal from '../components/MapModal';
import { motion } from 'framer-motion';

const { TextArea } = Input;

const RestaurantRegistration = () => {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [loading, setLoading] = useState(false);
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [coordinates, setCoordinates] = useState(null);

  // State quản lý ảnh upload
  const [fileList, setFileList] = useState([]);
  const [previewImage, setPreviewImage] = useState('');

  // Form instance để xử lý dữ liệu
  const [form] = Form.useForm();

  // useEffect(() => {
  //   if (!user) {
  //     message.warning('Bạn cần đăng nhập để thực hiện chức năng này!');
  //     navigate('/login');
  //   }
  // }, [user, navigate]);

  // Xử lý khi người dùng chọn ảnh
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
    const isLt5M = file.size / 1024 / 1024 < 5;
    if (!isLt5M) {
      message.error('Dung lượng ảnh phải nhỏ hơn 5MB!');
      return Upload.LIST_IGNORE;
    }

    return false;
  };

  // Hàm chuyển file sang base64 để preview
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

    message.loading({ content: 'Đang lấy địa chỉ...', key: 'geocoding' });

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`
      );
      const data = await response.json();

      // Cập nhật vào ô input Địa chỉ
      if (data.display_name) {
        form.setFieldsValue({
          address: data.display_name,
        });
        message.success({ content: 'Đã cập nhật địa chỉ!', key: 'geocoding' });
      }
    } catch (error) {
      console.error(error);
      message.error({
        content: 'Không thể lấy tên đường, vui lòng nhập tay.',
        key: 'geocoding',
      });
    }
  };

  // XỬ LÝ SUBMIT FORM
  const onFinish = async (values) => {
    setLoading(true);

    try {
      if (!user || !user.id) {
        message.error('Lỗi thông tin người dùng. Vui lòng đăng nhập lại.');
        return;
      }

      // 1. Kiểm tra ảnh
      if (fileList.length === 0) {
        message.error('Vui lòng chọn ảnh đại diện cho quán!');
        setLoading(false);
        return;
      }

      // 2. Upload ảnh lên Cloudinary (hoặc server của bạn)
      const uploadData = new FormData();
      // fileList[0].originFileObj là file gốc
      uploadData.append('file', fileList[0].originFileObj);

      const uploadRes = await axios.post(
        'http://localhost:8080/api/upload/image',
        uploadData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );

      const coverImageUrl = uploadRes.data;

      // 3. Gửi dữ liệu đăng ký
      const registrationData = {
        restaurantName: values.restaurantName,
        address: values.address,
        phone: values.phone,
        description: values.description,
        ownerFullName: values.ownerFullName,
        idCardNumber: values.idCardNumber,
        coverImageUrl: coverImageUrl,
        accountId: user.id,
        latitude: coordinates?.latitude || null,
        longitude: coordinates?.longitude || null,
      };

      await axios.post(
        'http://localhost:8080/api/restaurants/register',
        registrationData
      );

      message.success('Đăng ký thành công! Đang chuyển hướng...');
      setTimeout(() => {
        navigate('/my-registrations');
      }, 1500);
    } catch (err) {
      console.error(err);
      message.error(err.response?.data || 'Có lỗi xảy ra, vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modern-page-container">
      <motion.div
        className="modern-card"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="modern-header">
          <h2>Đăng ký Đối tác Quán Ăn</h2>
          <p>
            Trở thành đối tác của Food Order và tiếp cận hàng triệu khách hàng
          </p>
        </div>

        <MapModal
          isOpen={isMapOpen}
          onClose={() => setIsMapOpen(false)}
          onConfirm={handleMapConfirm}
        />

        <div className="modern-body">
          <Form form={form} layout="vertical" onFinish={onFinish} size="large">
            <Row gutter={40}>
              <Col xs={24} md={12}>
                <div className="section-title">Thông tin chủ quán</div>
                <Form.Item
                  name="ownerFullName"
                  label="Họ và tên"
                  rules={[{ required: true, message: 'Nhập họ tên!' }]}
                >
                  <Input
                    prefix={<UserOutlined />}
                    placeholder="Nhập họ và tên"
                  />
                </Form.Item>
                <Form.Item
                  name="idCardNumber"
                  label="Số CCCD / CMND"
                  rules={[{ required: true, message: 'Nhập CCCD!' }]}
                >
                  <Input
                    prefix={<IdcardOutlined />}
                    placeholder="Số giấy tờ tùy thân"
                  />
                </Form.Item>
                <Form.Item
                  name="phone"
                  label="Số điện thoại"
                  rules={[{ required: true, message: 'Nhập SĐT!' }]}
                >
                  <Input
                    prefix={<PhoneOutlined />}
                    placeholder="Số điện thoại liên hệ"
                  />
                </Form.Item>
              </Col>

              <Col xs={24} md={12}>
                <div className="section-title">Thông tin quán ăn</div>
                <Form.Item
                  name="restaurantName"
                  label="Tên quán"
                  rules={[{ required: true, message: 'Nhập tên quán!' }]}
                >
                  <Input
                    prefix={<ShopOutlined />}
                    placeholder="Tên quán hiển thị"
                  />
                </Form.Item>
                <Form.Item
                  name="address"
                  label="Địa chỉ"
                  rules={[{ required: true, message: 'Chọn địa chỉ!' }]}
                >
                  <Input
                    prefix={<EnvironmentOutlined />}
                    placeholder="Nhấn để chọn trên bản đồ"
                    readOnly
                    onClick={() => setIsMapOpen(true)}
                    style={{ cursor: 'pointer' }}
                  />
                </Form.Item>
                <Form.Item name="description" label="Mô tả ngắn">
                  <TextArea rows={2} placeholder="Giới thiệu về quán..." />
                </Form.Item>
              </Col>
            </Row>

            <Divider
              orientation="left"
              style={{
                borderColor: '#ffe6de',
                color: '#ff6b35',
                fontSize: '14px',
              }}
            >
              HÌNH ẢNH ĐẠI DIỆN
            </Divider>

            <Row justify="center">
              <Col span={24}>
                <Form.Item required style={{ textAlign: 'center' }}>
                  <Upload
                    listType="picture-card"
                    className="avatar-uploader"
                    showUploadList={false}
                    beforeUpload={beforeUpload}
                    onChange={handleChange}
                    maxCount={1}
                    style={{ width: '100%', height: '400px' }}
                  >
                    {fileList.length > 0 ? (
                      <div
                        style={{
                          position: 'relative',
                          width: '100%',
                          height: '100%',
                        }}
                      >
                        <img
                          src={
                            previewImage ||
                            URL.createObjectURL(fileList[0].originFileObj)
                          }
                          alt="avatar"
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            borderRadius: '16px',
                          }}
                        />
                        <Button
                          type="primary"
                          danger
                          shape="circle"
                          icon={<DeleteOutlined />}
                          size="small"
                          onClick={handleRemoveImage}
                          style={{ position: 'absolute', top: 10, right: 10 }}
                        />
                      </div>
                    ) : (
                      <div>
                        {loading ? (
                          <LoadingOutlined />
                        ) : (
                          <PlusOutlined
                            style={{ fontSize: 32, color: '#ff6b35' }}
                          />
                        )}
                        <div style={{ marginTop: 8, color: '#666' }}>
                          Tải ảnh đại diện (Tối đa 5MB)
                        </div>
                      </div>
                    )}
                  </Upload>
                </Form.Item>
              </Col>
            </Row>

            <Form.Item style={{ marginTop: 20 }}>
              <Button type="primary" htmlType="submit" block loading={loading}>
                GỬI YÊU CẦU ĐĂNG KÝ
              </Button>
            </Form.Item>
          </Form>
        </div>
      </motion.div>
    </div>
  );
};

export default RestaurantRegistration;
