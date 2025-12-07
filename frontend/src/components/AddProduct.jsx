import React, { useState, useMemo, useEffect } from 'react';
import { Form, Button, Container, Row, Col, Card, Alert, Table, InputGroup } from 'react-bootstrap';

// Dữ liệu tạm để test frontend
const MOCK_CATEGORIES = [
  { id: 1, name: 'Trà sữa & Cà phê' },
  { id: 2, name: 'Đồ ăn nhanh' },
  { id: 3, name: 'Món chính' },
];

const MOCK_CATEGORY_ATTRIBUTES = [
  { id: 1, category_id: 1, name: 'Size', data_type: 'SELECT' }, 
  { id: 2, category_id: 1, name: 'Mức đường', data_type: 'SELECT' },
  { id: 3, category_id: 1, name: 'Topping', data_type: 'CHECKBOX' }, 
];

const getAttributesByCategoryId = (categoryId) => {
    return MOCK_CATEGORY_ATTRIBUTES.filter(attr => attr.category_id === categoryId);
};

const MOCK_RESTAURANT_ID = 1; 

// Component con để quản lý Product Details
const AttributeEditor = React.memo(({ attribute, details, onAddDetail, onDetailChange, onRemoveDetail }) => {
    
    return (
        <Card className="mb-4 border-primary border-opacity-25" bg="light">
            <Card.Header as="h5" className="text-primary text-center">
                {attribute.name}
            </Card.Header>
            <Card.Body className="p-3">
                <Table striped bordered hover size="sm">
                    <thead>
                        <tr>
                            <th className="w-45">{attribute.name}</th>
                            <th className="w-35">Giá Điều chỉnh (VND)</th>
                            <th className="w-20">Hành động</th>
                        </tr>
                    </thead>
                    <tbody>
                        {details.map((detail, index) => (
                            <tr key={index}>
                                <td>
                                    <Form.Control
                                        type="text"
                                        value={detail.value}
                                        onChange={(e) => onDetailChange(attribute.id, index, 'value', e.target.value)}
                                        placeholder={`Nhập giá trị, VD: L, 50%`}
                                        required
                                    />
                                </td>
                                <td>
                                    <InputGroup>
                                        <Form.Control
                                            type="number"
                                            value={detail.price_adjustment}
                                            onChange={(e) => onDetailChange(attribute.id, index, 'price_adjustment', e.target.value)}
                                            min="0"
                                            step="1000"
                                        />
                                        <InputGroup.Text>VND</InputGroup.Text>
                                    </InputGroup>
                                </td>
                                <td>
                                    <Button 
                                        variant="danger" 
                                        size="sm"
                                        onClick={() => onRemoveDetail(attribute.id, index)} 
                                        className="w-100">
                                        Xóa
                                    </Button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </Table>

                <Button 
                    variant="info" 
                    onClick={() => onAddDetail(attribute.id)} 
                    className="mt-2 text-white">
                  + Thêm Tùy chọn cho {attribute.name}
                </Button>
            </Card.Body>
        </Card>
    );
});

export default function AddProduct() {
  const [productData, setProductData] = useState({
    name: '',
    description: '',
    category_id: MOCK_CATEGORIES.length > 0 ? MOCK_CATEGORIES[0].id : '', 
    price: 0.00,
    is_available: true, 
    restaurant_id: MOCK_RESTAURANT_ID, 
  });
  
  const [productImage, setProductImage] = useState(null); 
  const [imagePreview, setImagePreview] = useState(null);
  const [productDetails, setProductDetails] = useState({});

  const activeAttributes = useMemo(() => {
    if (!productData.category_id) return [];
    return getAttributesByCategoryId(productData.category_id);
  }, [productData.category_id]); 
  
  // Tạo, reset ProductDetails khi Category đổi (Đã sửa lỗi hook)
  useEffect(() => {
    const categoryId = productData.category_id;
    if (!categoryId) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setProductDetails({});
        return;
    }
    
    const initialDetails = {};
    const attributes = getAttributesByCategoryId(categoryId);
    
    attributes.forEach(attr => {
        // Khởi tạo mảng rỗng nếu chưa tồn tại, hoặc giữ nguyên nếu đã có dữ liệu từ trước
        initialDetails[attr.id] = productDetails[attr.id] || []; 
    });

    // Chỉ gọi setProductDetails nếu cấu trúc keys thay đổi 
    const currentKeys = Object.keys(productDetails).sort().join(',');
    const initialKeys = attributes.map(a => a.id).sort().join(',');

    if (currentKeys !== initialKeys) {
        setProductDetails(initialDetails);
    }

  }, [productData.category_id, productDetails]); 


  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    let processedValue = value;
    if (name === 'category_id' || name === 'price') {
        processedValue = name === 'category_id' ? Number(value) : (Number(value) >= 0 ? Number(value) : 0);
    }

    setProductData({
      ...productData,
      [name]: type === 'checkbox' ? checked : processedValue,
    });
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProductImage(file);
      setImagePreview(URL.createObjectURL(file));
    } else {
        setImagePreview(null);
        setProductImage(null);
    }
  };

  // --- handle product detail ---
  
  const handleAddDetail = (attributeId) => {
    const newDetail = { value: '', price_adjustment: 0.00 };
    
    setProductDetails(prevDetails => ({
      ...prevDetails,
      [attributeId]: [...(prevDetails[attributeId] || []), newDetail]
    }));
  };

  const handleDetailChange = (attributeId, index, field, value) => {
    const newDetails = [...(productDetails[attributeId] || [])];
    
    newDetails[index] = {
      ...newDetails[index],
      [field]: field === 'price_adjustment' ? (Number(value) >= 0 ? Number(value) : 0) : value 
    };

    setProductDetails(prevDetails => ({
      ...prevDetails,
      [attributeId]: newDetails
    }));
  };

  const handleRemoveDetail = (attributeId, index) => {
    setProductDetails(prevDetails => ({
      ...prevDetails,
      [attributeId]: prevDetails[attributeId].filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const flattenedDetails = Object.entries(productDetails).flatMap(([attributeId, detailsArray]) => 
        detailsArray.map(detail => ({ 
            ...detail, 
            attribute_id: Number(attributeId) 
        }))
    ).filter(detail => detail.value.trim() !== '');
    
    console.log('Product Data:', productData);
    console.log('Flattened Details:', flattenedDetails);
    console.log('Image File:', productImage);

    alert('Thêm sản phẩm thành công!');
  };

  return (
    <Container className="py-4" style={{ backgroundColor: '#f8f9fa' }}>
      <Row className="justify-content-center">
        <Col md={10} lg={8}>
          <Card className="shadow">
            <Card.Header as="h2" className="text-center">
                Thêm Sản Phẩm
            </Card.Header>
            <Card.Body>
              <Form onSubmit={handleSubmit}>

                {/* 1. THÔNG TIN SẢN PHẨM CƠ BẢN */}
                <fieldset className="border p-4 rounded mb-4">
                    <legend className="float-none w-auto px-2 fs-5 text-primary">1. Thông tin cơ bản</legend>
                    
                    <Row className="mb-3">
                        <Form.Group as={Col} controlId="productName" md={8}>
                            <Form.Label className="fw-bold">Tên sản phẩm:</Form.Label>
                            <Form.Control type="text" name="name" value={productData.name} onChange={handleChange} required placeholder="Ví dụ: Trà sữa Trân châu Đường đen" />
                        </Form.Group>
                        <Form.Group as={Col} controlId="productPrice" md={4}>
                            <Form.Label className="fw-bold">Giá (VND):</Form.Label>
                            <InputGroup>
                                <Form.Control type="number" name="price" value={productData.price} onChange={handleChange} required min="0" step="1000" />
                                <InputGroup.Text>VND</InputGroup.Text>
                            </InputGroup>
                        </Form.Group>
                    </Row>

                    <Row className="mb-3">
                        <Form.Group as={Col} controlId="productCategory" md={6}>
                            <Form.Label className="fw-bold">Danh mục:</Form.Label>
                            <Form.Select name="category_id" value={productData.category_id} onChange={handleChange} required>
                                {MOCK_CATEGORIES.map((cat) => (
                                    <option key={cat.id} value={cat.id}>
                                        {cat.name}
                                    </option>
                                ))}
                            </Form.Select>
                        </Form.Group>
                        <Form.Group as={Col} controlId="isAvailable" md={6} className="d-flex align-items-end">
                            <Form.Check 
                                type="checkbox"
                                id="is_available"
                                name="is_available"
                                checked={productData.is_available}
                                onChange={handleChange}
                                label={`Trạng thái: ${productData.is_available ? 'Còn' : 'Hết'}`}
                                className="pb-1"
                            />
                        </Form.Group>
                    </Row>

                    <Form.Group controlId="productDescription" className="mb-3">
                        <Form.Label className="fw-bold">Miêu tả:</Form.Label>
                        <Form.Control as="textarea" rows={3} name="description" value={productData.description} onChange={handleChange} placeholder="Mô tả chi tiết về món ăn" />
                    </Form.Group>

                    <Form.Group controlId="productImage" className="mb-3">
                        <Form.Label className="fw-bold">Ảnh sản phẩm (Tối đa 1 File):</Form.Label>
                        <Form.Control type="file" name="imageFile" accept="image/*" onChange={handleFileChange} required={!imagePreview} />
                        {imagePreview && (
                            <div className="mt-3 text-center border p-2 rounded">
                                <img src={imagePreview} alt="Preview" style={{ maxWidth: '100%', height: 'auto', maxHeight: '150px', borderRadius: '4px' }} className="img-fluid" />
                            </div>
                        )}
                    </Form.Group>
                </fieldset>

                {/* Quản lý tùy chọn thuộc tính  */}
                <fieldset className="border p-4 rounded mb-4">
                    <legend className="float-none w-auto px-2 fs-5 text-danger">2. Cấu hình</legend>
                    <p className="fst-italic text-muted mb-3">
                        Định nghĩa các tùy chọn cho sản phẩm này dựa trên danh mục món đã chọn.
                    </p>

                    {activeAttributes.length > 0 ? (
                        activeAttributes.map((attr) => (
                            <AttributeEditor
                                key={attr.id}
                                attribute={attr}
                                // Lấy chi tiết từ state productDetails
                                details={productDetails[attr.id] || []} 
                                onAddDetail={handleAddDetail}
                                onDetailChange={handleDetailChange}
                                onRemoveDetail={handleRemoveDetail}
                            />
                        ))
                    ) : (
                        <Alert variant="success" className="border-start border-5 border-success">
                            Danh mục {MOCK_CATEGORIES.find(c => c.id === productData.category_id)?.name} không yêu cầu thuộc tính tùy chỉnh.
                        </Alert>
                    )}
                </fieldset>

                <Button variant="danger" type="submit" className="w-100 mt-3">
                  Lưu sản phẩm
                </Button>
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}