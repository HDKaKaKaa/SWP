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
  Modal,
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
  EyeOutlined,
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
  const [licenseFileList, setLicenseFileList] = useState([]);
  const [fileList, setFileList] = useState([]);
  const [previewImage, setPreviewImage] = useState('');
  const [coverFileList, setCoverFileList] = useState([]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewTitle, setPreviewTitle] = useState('');

  const [form] = Form.useForm();

  const handleCancelPreview = () => setPreviewOpen(false);

  const handlePreview = async (file) => {
    if (!file.url && !file.preview) {
      file.preview = await getBase64(file.originFileObj);
    }
    setPreviewImage(file.url || file.preview);
    setPreviewOpen(true);
    setPreviewTitle(
      file.name || file.url.substring(file.url.lastIndexOf('/') + 1)
    );
  };

  const handleRemoveCoverImage = (e) => {
    e.stopPropagation();
    setCoverFileList([]);
    setPreviewImage('');
    form.setFieldsValue({ coverImage: [] });
  };

  const handleChange = ({ fileList: newFileList }) => setFileList(newFileList);

  const beforeUpload = (file) => {
    const isJpgOrPng = file.type === 'image/jpeg' || file.type === 'image/png';
    if (!isJpgOrPng) {
      message.error('Chỉ có thể upload file JPG/PNG!');
      return Upload.LIST_IGNORE;
    }
    const isLt5M = file.size / 1024 / 1024 < 5;
    if (!isLt5M) {
      message.error('Dung lượng ảnh phải nhỏ hơn 5MB!');
      return Upload.LIST_IGNORE;
    }
    return false;
  };

  const handleChangeCover = ({ fileList }) => setCoverFileList(fileList);
  const handleChangeLicense = ({ fileList }) => setLicenseFileList(fileList);

  const normFile = (e) => {
    if (Array.isArray(e)) return e;
    return e?.fileList;
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

  const handleRemoveLicenseImage = (file) => {
    const newFileList = licenseFileList.filter((item) => item.uid !== file.uid);
    setLicenseFileList(newFileList);
  };

  // XỬ LÝ SUBMIT FORM
  const onFinish = async (values) => {
    setLoading(true);
    try {
      if (!user || !user.id) {
        message.error('Vui lòng đăng nhập!');
        return;
      }

      // 1. Upload Cover Image
      const coverData = new FormData();
      coverData.append('file', values.coverImage[0].originFileObj);
      const coverRes = await axios.post(
        'http://localhost:8080/api/upload/image',
        coverData
      );
      const coverUrl = coverRes.data;

      // 2. Upload License Images
      const licenseUrls = [];
      for (const file of values.licenseImages) {
        const formData = new FormData();
        formData.append('file', file.originFileObj);
        const res = await axios.post(
          'http://localhost:8080/api/upload/image',
          formData
        );
        licenseUrls.push(res.data);
      }

      // 3. Gửi dữ liệu đăng ký
      const registrationData = {
        restaurantName: values.restaurantName,
        address: values.address,
        phone: values.phone,
        description: values.description,
        ownerFullName: values.ownerFullName,
        idCardNumber: values.idCardNumber,
        coverImageUrl: coverUrl,
        licenseImages: licenseUrls,
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

  const uploadButton = (label) => (
    <div>
      <PlusOutlined className="upload-icon" />
      <div className="upload-text">{label}</div>
    </div>
  );

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

        {/* Modal Preview Ảnh */}
        <Modal
          open={previewOpen}
          title={previewTitle}
          footer={null}
          onCancel={handleCancelPreview}
        >
          <img alt="preview" style={{ width: '100%' }} src={previewImage} />
        </Modal>

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
                  <Input prefix={<UserOutlined />} />
                </Form.Item>
                <Form.Item
                  name="idCardNumber"
                  label="Số CCCD / CMND"
                  rules={[{ required: true, message: 'Nhập CCCD!' }]}
                >
                  <Input prefix={<IdcardOutlined />} />
                </Form.Item>
                <Form.Item
                  name="phone"
                  label="Số điện thoại"
                  rules={[{ required: true, message: 'Nhập SĐT!' }]}
                >
                  <Input prefix={<PhoneOutlined />} />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <div className="section-title">Thông tin quán</div>
                <Form.Item
                  name="restaurantName"
                  label="Tên quán"
                  rules={[{ required: true, message: 'Nhập tên quán!' }]}
                >
                  <Input prefix={<ShopOutlined />} />
                </Form.Item>
                <Form.Item
                  name="address"
                  label="Địa chỉ"
                  rules={[{ required: true, message: 'Chọn địa chỉ!' }]}
                >
                  <Input
                    prefix={<EnvironmentOutlined />}
                    readOnly
                    onClick={() => setIsMapOpen(true)}
                    style={{ cursor: 'pointer' }}
                    placeholder="Chọn trên bản đồ"
                  />
                </Form.Item>
                <Form.Item name="description" label="Mô tả">
                  <TextArea rows={2} />
                </Form.Item>
              </Col>
            </Row>

            <Divider style={{ borderColor: '#ffe6de', color: '#ff6b35' }}>
              HÌNH ẢNH & GIẤY PHÉP
            </Divider>

            <Row gutter={40}>
              {/* 1. COVER IMAGE - Custom Render */}
              <Col xs={24} md={12}>
                <Form.Item
                  name="coverImage"
                  label="Ảnh đại diện quán"
                  valuePropName="fileList"
                  getValueFromEvent={normFile}
                  rules={[
                    { required: true, message: 'Vui lòng chọn ảnh đại diện!' },
                  ]}
                >
                  <Upload
                    listType="picture-card"
                    className="avatar-uploader"
                    fileList={coverFileList}
                    showUploadList={false}
                    beforeUpload={beforeUpload}
                    onChange={handleChangeCover}
                    maxCount={1}
                  >
                    {coverFileList.length > 0 ? (
                      <div className="custom-upload-item">
                        <img
                          src={
                            previewImage ||
                            coverFileList[0].url ||
                            URL.createObjectURL(coverFileList[0].originFileObj)
                          }
                          alt="avatar"
                        />
                        <div className="custom-upload-mask">
                          <EyeOutlined
                            className="mask-icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePreview(coverFileList[0]);
                            }}
                          />
                          <DeleteOutlined
                            className="mask-icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveCoverImage(e);
                            }}
                          />
                        </div>
                      </div>
                    ) : (
                      uploadButton('Thêm ảnh')
                    )}
                  </Upload>
                </Form.Item>
              </Col>

              {/* 2. LICENSE IMAGES */}
              <Col xs={24} md={12}>
                <Form.Item label="Giấy phép kinh doanh" required>
                  {/* Container chứa các ảnh đã upload + nút thêm */}
                  <div className="license-list-container">
                    {/* Render danh sách ảnh thủ công */}
                    {licenseFileList.map((file) => {
                      // Logic lấy URL an toàn
                      let src = '';
                      if (file.url) {
                        src = file.url; // Trường hợp ảnh cũ (Edit) hoặc đã có link
                      } else if (file.originFileObj) {
                        src = URL.createObjectURL(file.originFileObj); // Trường hợp Antd Upload File
                      } else if (file instanceof File) {
                        src = URL.createObjectURL(file); // [QUAN TRỌNG] Trường hợp File object thuần (do beforeUpload trả về false)
                      }

                      return (
                        <div className="custom-upload-item" key={file.uid}>
                          <img
                            src={src}
                            alt="license"
                            onLoad={() => {
                              // Giải phóng bộ nhớ nếu là blob URL
                              if (src.startsWith('blob:'))
                                URL.revokeObjectURL(src);
                            }}
                          />
                          <div className="custom-upload-mask">
                            <EyeOutlined
                              className="mask-icon"
                              onClick={() => handlePreview(file)}
                            />
                            <DeleteOutlined
                              className="mask-icon"
                              onClick={() => handleRemoveLicenseImage(file)}
                            />
                          </div>
                        </div>
                      );
                    })}

                    {licenseFileList.length < 5 && (
                      <Form.Item
                        name="licenseImages"
                        valuePropName="fileList"
                        getValueFromEvent={normFile}
                        rules={[
                          {
                            required: true,
                            message: 'Vui lòng upload giấy phép!',
                          },
                        ]}
                        style={{ margin: 0 }}
                      >
                        <Upload
                          listType="picture-card"
                          className="license-uploader"
                          fileList={[]}
                          showUploadList={false}
                          beforeUpload={(file) => {
                            const isValid = beforeUpload(file);
                            if (isValid === Upload.LIST_IGNORE)
                              return Upload.LIST_IGNORE;
                            if (!file.uid)
                              file.uid = Date.now() + Math.random().toString();

                            setLicenseFileList((prev) => [...prev, file]);

                            return false;
                          }}
                          multiple={true}
                          maxCount={5}
                        >
                          {uploadButton('Thêm ảnh')}
                        </Upload>
                      </Form.Item>
                    )}
                  </div>
                </Form.Item>
              </Col>
            </Row>

            <Form.Item style={{ marginTop: 30 }}>
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
