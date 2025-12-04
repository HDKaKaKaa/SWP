import React, { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import '../css/RestaurantRegistration.css'; // Import CSS mới

// Import Ant Design Components
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
} from '@ant-design/icons';

const { TextArea } = Input;

const RestaurantRegistration = () => {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [loading, setLoading] = useState(false);

  // State quản lý ảnh upload
  const [fileList, setFileList] = useState([]);
  const [previewImage, setPreviewImage] = useState('');

  // Form instance để xử lý dữ liệu
  const [form] = Form.useForm();

  useEffect(() => {
    if (!user) {
      message.warning('Bạn cần đăng nhập để thực hiện chức năng này!');
      navigate('/login');
    }
  }, [user, navigate]);

  // Xử lý khi người dùng chọn ảnh
  const handlePreview = async (file) => {
    if (!file.url && !file.preview) {
      file.preview = await getBase64(file.originFileObj);
    }
    setPreviewImage(file.url || file.preview);
  };

  const handleChange = ({ fileList: newFileList }) => setFileList(newFileList);

  // Chặn auto upload của Antd, chỉ lấy file để gửi thủ công
  const beforeUpload = (file) => {
    // Kiểm tra định dạng ảnh
    const isJpgOrPng = file.type === 'image/jpeg' || file.type === 'image/png';
    if (!isJpgOrPng) {
      message.error('Bạn chỉ có thể upload file JPG/PNG!');
      return Upload.LIST_IGNORE;
    }
    return false; // Return false để không tự động upload ngay
  };

  // Hàm chuyển file sang base64 để preview
  const getBase64 = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
    });

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
                  name="address"
                  label="Địa chỉ quán"
                  normalize={(v) => v?.trimStart()}
                  rules={[
                    { required: true, message: 'Vui lòng nhập địa chỉ!' },
                  ]}
                >
                  <Input
                    prefix={<HomeOutlined />}
                    placeholder="Số nhà, đường, phường, quận..."
                  />
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
                    showUploadList={false} // Tắt list mặc định để tự custom preview
                    beforeUpload={beforeUpload}
                    onChange={handleChange}
                    maxCount={1}
                  >
                    {fileList.length > 0 ? (
                      <img
                        src={URL.createObjectURL(fileList[0].originFileObj)}
                        alt="avatar"
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          borderRadius: '8px',
                        }}
                      />
                    ) : (
                      <div style={{ padding: 20 }}>
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
