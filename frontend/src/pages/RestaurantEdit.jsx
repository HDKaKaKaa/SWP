import React, { useContext, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
  Divider,
  Skeleton,
  Modal,
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
  EyeOutlined,
} from '@ant-design/icons';
import MapModal from '../components/MapModal';
import { motion } from 'framer-motion';

const { TextArea } = Input;

const RestaurantEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [coordinates, setCoordinates] = useState(null);
  const [coverFileList, setCoverFileList] = useState([]);
  const [licenseFileList, setLicenseFileList] = useState([]);
  const [fileList, setFileList] = useState([]);
  const [previewImage, setPreviewImage] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewTitle, setPreviewTitle] = useState('');

  const [form] = Form.useForm();

  // 1. LOAD DỮ LIỆU CŨ KHI VÀO TRANG
  useEffect(() => {
    const fetchRestaurantData = async () => {
      try {
        const res = await axios.get(
          `http://localhost:8080/api/restaurants/${id}`
        );
        const data = res.data;

        if (data.owner && data.owner.accountId !== user.id) {
          message.error('Bạn không có quyền sửa quán này!');
          navigate('/my-registrations');
          return;
        }

        form.setFieldsValue({
          restaurantName: data.name,
          address: data.address,
          phone: data.phone,
          description: data.description,
          ownerFullName: data.owner?.fullName,
          idCardNumber: data.owner?.idCardNumber,
        });

        if (data.latitude && data.longitude) {
          setCoordinates({
            latitude: data.latitude,
            longitude: data.longitude,
          });
        }

        if (data.coverImage) {
          const cover = {
            uid: '-1',
            name: 'cover.png',
            status: 'done',
            url: data.coverImage,
          };
          setCoverFileList([cover]);
          form.setFieldsValue({ coverImage: [cover] });
        }

        if (data.licenseImage) {
          const urls = data.licenseImage.split(',');
          const licenses = urls.map((url, index) => ({
            uid: `lic-${index}`,
            name: `license-${index + 1}.png`,
            status: 'done',
            url: url,
          }));
          setLicenseFileList(licenses);
          form.setFieldsValue({ licenseImages: licenses });
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

  const handleChangeCover = ({ fileList }) => setCoverFileList(fileList);
  const handleChangeLicense = ({ fileList }) => setLicenseFileList(fileList);
  const normFile = (e) => (Array.isArray(e) ? e : e?.fileList);

  const beforeUpload = (file) => {
    const isJpgOrPng = file.type === 'image/jpeg' || file.type === 'image/png';
    if (!isJpgOrPng) {
      message.error('Bạn chỉ có thể upload file JPG/PNG!');
      return Upload.LIST_IGNORE;
    }
    return false;
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
    form.setFieldsValue({
      address: `Đã chọn vị trí mới (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
    });
  };

  const handleRemoveLicenseImage = (file) => {
    const newFileList = licenseFileList.filter((item) => item.uid !== file.uid);
    setLicenseFileList(newFileList);
  };

  // 2. XỬ LÝ LƯU (UPDATE)
  const onFinish = async (values) => {
    setLoading(true);
    try {
      // 1. Xử lý Cover Image
      let finalCoverUrl = '';
      const coverFile = values.coverImage[0];
      if (coverFile.url) {
        finalCoverUrl = coverFile.url;
      } else {
        const formData = new FormData();
        formData.append('file', coverFile.originFileObj);
        const res = await axios.post(
          'http://localhost:8080/api/upload/image',
          formData
        );
        finalCoverUrl = res.data;
      }

      // 2. Xử lý License Images
      const finalLicenseUrls = [];
      for (const file of values.licenseImages) {
        if (file.url) {
          finalLicenseUrls.push(file.url);
        } else {
          const formData = new FormData();
          formData.append('file', file.originFileObj);
          const res = await axios.post(
            'http://localhost:8080/api/upload/image',
            formData
          );
          finalLicenseUrls.push(res.data);
        }
      }

      const updateData = {
        restaurantName: values.restaurantName,
        address: values.address,
        phone: values.phone,
        description: values.description,
        ownerFullName: values.ownerFullName,
        idCardNumber: values.idCardNumber,
        coverImageUrl: finalCoverUrl,
        licenseImages: finalLicenseUrls,
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

  const uploadButton = (label) => (
    <div>
      <PlusOutlined className="upload-icon" />
      <div className="upload-text">{label}</div>
    </div>
  );

  if (fetching)
    return (
      <div style={{ padding: 50, textAlign: 'center' }}>
        <Skeleton active />
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
        <div
          className="modern-header"
          style={{
            background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
          }}
        >
          <h2>Cập nhật thông tin Quán</h2>
          <p>Chỉnh sửa thông tin - Quán sẽ cần được duyệt lại</p>
        </div>

        <MapModal
          isOpen={isMapOpen}
          onClose={() => setIsMapOpen(false)}
          onConfirm={handleMapConfirm}
        />

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
                <div className="section-title" style={{ color: '#1890ff' }}>
                  Thông tin chủ quán
                </div>
                <Form.Item
                  name="ownerFullName"
                  label="Họ tên"
                  rules={[{ required: true }]}
                >
                  <Input prefix={<UserOutlined />} />
                </Form.Item>
                <Form.Item
                  name="idCardNumber"
                  label="Số CCCD / CMND"
                  rules={[{ required: true }]}
                >
                  <Input prefix={<IdcardOutlined />} />
                </Form.Item>
                <Form.Item
                  name="phone"
                  label="Số điện thoại"
                  rules={[{ required: true }]}
                >
                  <Input prefix={<PhoneOutlined />} />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <div className="section-title" style={{ color: '#1890ff' }}>
                  Thông tin quán
                </div>
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
                    style={{ cursor: 'pointer' }}
                  />
                </Form.Item>
                <Form.Item name="description" label="Mô tả">
                  <TextArea rows={2} />
                </Form.Item>
              </Col>
            </Row>

            <Divider style={{ color: '#1890ff', borderColor: '#91d5ff' }}>
              HÌNH ẢNH & GIẤY PHÉP
            </Divider>
            <Row gutter={40}>
              <Col xs={24} md={12}>
                <Form.Item
                  name="coverImage"
                  label="Ảnh đại diện"
                  valuePropName="fileList"
                  getValueFromEvent={normFile}
                  rules={[
                    { required: true, message: 'Vui lòng chọn ảnh đại diện! ' },
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
                          src={(() => {
                            const file = coverFileList[0];
                            if (file.url) return file.url;
                            if (file.originFileObj)
                              return URL.createObjectURL(file.originFileObj);
                            if (file instanceof File)
                              return URL.createObjectURL(file);
                            return '';
                          })()}
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

              <Col xs={24} md={12}>
                <Form.Item label="Giấy phép kinh doanh" required>
                  <div className="license-list-container">
                    {/* Render ảnh cũ + mới */}
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

                    {/* Nút Upload */}
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
              <Button
                type="primary"
                htmlType="submit"
                block
                loading={loading}
                style={{ background: '#1890ff', borderColor: '#1890ff' }}
              >
                LƯU THAY ĐỔI
              </Button>
            </Form.Item>
          </Form>
        </div>
      </motion.div>
    </div>
  );
};

export default RestaurantEdit;
