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
        navigate('/owner/dashboard');
      }, 1500);
    } catch (err) {
      console.error(err);
      message.error(err.response?.data || 'Có lỗi xảy ra, vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="res-reg-container">
      <div className="res-reg-overlay"></div>

      <div className="res-reg-card">
        <div className="res-reg-header">
          <h2>Đăng ký Đối tác Nhà hàng</h2>
          <p style={{ opacity: 0.8, marginTop: 5 }}>
            Hãy trở thành đối tác của Foorder ngay hôm nay
          </p>
        </div>

        <MapModal
          isOpen={isMapOpen}
          onClose={() => setIsMapOpen(false)}
          onConfirm={handleMapConfirm}
        />

        <div className="res-reg-body">
          <Form
            form={form}
            layout="vertical"
            onFinish={onFinish}
            size="large"
            scrollToFirstError
          >
            <Row gutter={40}>
              {/* CỘT TRÁI: THÔNG TIN CHỦ QUÁN */}
              <Col xs={24} md={12}>
                <div className="section-title">Thông tin chủ quán</div>

                <Form.Item
                  name="ownerFullName"
                  label="Họ và tên chủ quán"
                  normalize={(v) => v?.trimStart()}
                  rules={[{ required: true, message: 'Vui lòng nhập họ tên!' }]}
                >
                  <Input
                    prefix={<UserOutlined />}
                    placeholder="Ví dụ: Nguyễn Văn A"
                  />
                </Form.Item>

                <Form.Item
                  name="idCardNumber"
                  label="Số CCCD / CMND"
                  normalize={(v) => v?.replace(/\s/g, '')}
                  rules={[
                    { required: true, message: 'Vui lòng nhập số CCCD!' },
                    { pattern: /^\d{9,12}$/, message: 'CCCD phải từ 9-12 số' },
                  ]}
                >
                  <Input
                    prefix={<IdcardOutlined />}
                    placeholder="Nhập số giấy tờ tùy thân"
                    maxLength={12}
                  />
                </Form.Item>

                <Form.Item
                  name="phone"
                  label="Số điện thoại liên hệ"
                  normalize={(v) => v?.replace(/\s/g, '')}
                  rules={[
                    { required: true, message: 'Vui lòng nhập SĐT!' },
                    { pattern: /^0\d{9}$/, message: 'SĐT không hợp lệ' },
                  ]}
                >
                  <Input
                    prefix={<PhoneOutlined />}
                    placeholder="Nhập số điện thoại"
                    maxLength={10}
                  />
                </Form.Item>
              </Col>

              {/* CỘT PHẢI: THÔNG TIN QUÁN */}
              <Col xs={24} md={12}>
                <div className="section-title">Thông tin quán ăn</div>

                <Form.Item
                  name="restaurantName"
                  label="Tên quán ăn"
                  normalize={(v) => v?.trimStart()}
                  rules={[
                    { required: true, message: 'Vui lòng nhập tên quán!' },
                  ]}
                >
                  <Input
                    prefix={<ShopOutlined />}
                    placeholder="Ví dụ: Cơm Tấm Sài Gòn"
                  />
                </Form.Item>

                <Form.Item
                  label="Địa chỉ quán"
                  required
                  style={{ marginBottom: 0 }}
                >
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <Form.Item
                      name="address"
                      style={{ flex: 1 }}
                      rules={[
                        { required: true, message: 'Vui lòng nhập địa chỉ!' },
                      ]}
                    >
                      <Input
                        prefix={<HomeOutlined />}
                        placeholder="Số nhà, đường, phường, quận..."
                      />
                    </Form.Item>

                    <Button
                      icon={<EnvironmentOutlined />}
                      onClick={() => setIsMapOpen(true)}
                    >
                      Chọn trên bản đồ
                    </Button>
                  </div>
                  {coordinates && (
                    <div
                      style={{
                        fontSize: '12px',
                        color: '#1890ff',
                        marginTop: '-15px',
                        marginBottom: '15px',
                      }}
                    >
                      Đã chọn tọa độ: {coordinates.latitude.toFixed(6)},{' '}
                      {coordinates.longitude.toFixed(6)}
                    </div>
                  )}
                </Form.Item>

                <Form.Item name="description" label="Mô tả ngắn">
                  <TextArea
                    rows={2}
                    placeholder="Giới thiệu đôi nét về quán của bạn..."
                  />
                </Form.Item>
              </Col>
            </Row>

            <Divider
              orientation="left"
              style={{
                borderColor: '#ee4d2d',
                color: '#ee4d2d',
                fontSize: '14px',
              }}
            >
              HÌNH ẢNH ĐẠI DIỆN QUÁN
            </Divider>

            <Row justify="center">
              <Col span={24}>
                <Form.Item required style={{ textAlign: 'center' }}>
                  <Upload
                    name="avatar"
                    listType="picture-card"
                    className="avatar-uploader"
                    showUploadList={false}
                    beforeUpload={beforeUpload}
                    onChange={handleChange}
                    maxCount={1}
                    style={{ overflow: 'hidden' }}
                  >
                    {fileList.length > 0 ? (
                      <div
                        className="preview-wrapper"
                        style={{
                          position: 'relative',
                          width: '100%',
                          height: '100%',
                          aspectRatio: '1/1',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
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
                            borderRadius: '8px',
                          }}
                        />
                        <Button
                          type="primary"
                          danger
                          shape="circle"
                          icon={<DeleteOutlined />}
                          size="small"
                          onClick={handleRemoveImage}
                          style={{
                            position: 'absolute',
                            top: '5px',
                            right: '5px',
                            zIndex: 10,
                            opacity: 0.9,
                          }}
                        />
                      </div>
                    ) : (
                      <div
                        style={{
                          padding: 20,
                          aspectRatio: '1/1',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'center',
                          alignItems: 'center',
                        }}
                      >
                        {loading ? (
                          <LoadingOutlined />
                        ) : (
                          <PlusOutlined
                            style={{ fontSize: 24, color: '#999' }}
                          />
                        )}
                        <div className="upload-text">Nhấn để tải ảnh lên</div>
                      </div>
                    )}
                  </Upload>
                  <div
                    style={{ marginTop: 8, color: '#888', fontSize: '12px' }}
                  >
                    Hỗ trợ định dạng: JPG, PNG. Dung lượng tối đa 5MB.
                  </div>
                </Form.Item>
              </Col>
            </Row>

            <Form.Item style={{ marginTop: 20 }}>
              <Button
                type="primary"
                htmlType="submit"
                block
                loading={loading}
                style={{ height: '50px', fontSize: '18px', fontWeight: 'bold' }}
              >
                GỬI ĐĂNG KÝ
              </Button>
            </Form.Item>
          </Form>
        </div>
      </div>
    </div>
  );
};

export default RestaurantRegistration;
