package com.shopeefood.backend.payment.vnpay;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.*;

/**
 * Helper for VNPay signing + query-string building.
 */
public final class VnpayUtils {

    private VnpayUtils() {}

    public static String hmacSHA512(String key, String data) {
        try {
            Mac hmac512 = Mac.getInstance("HmacSHA512");
            SecretKeySpec secretKey = new SecretKeySpec(key.getBytes(StandardCharsets.UTF_8), "HmacSHA512");
            hmac512.init(secretKey);
            byte[] bytes = hmac512.doFinal(data.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder(bytes.length * 2);
            for (byte b : bytes) sb.append(String.format("%02x", b));
            return sb.toString();
        } catch (Exception e) {
            throw new RuntimeException("VNPay HMAC SHA512 error", e);
        }
    }

    /**
     * Sort by key ASC and URL-encode both key and value.
     */
    public static String buildQueryString(Map<String, String> params) {
        List<String> keys = new ArrayList<>(params.keySet());
        Collections.sort(keys);

        StringBuilder sb = new StringBuilder();
        for (String k : keys) {
            String v = params.get(k);
            if (v == null || v.isBlank()) continue;
            if (!sb.isEmpty()) sb.append("&");
            sb.append(URLEncoder.encode(k, StandardCharsets.UTF_8));
            sb.append('=');
            sb.append(URLEncoder.encode(v, StandardCharsets.UTF_8));
        }
        return sb.toString();
    }

    /**
     * Used for verifying: remove vnp_SecureHash & vnp_SecureHashType before sign.
     */
    public static String buildDataToSign(Map<String, String> vnpParams) {
        Map<String, String> data = new HashMap<>(vnpParams);
        data.remove("vnp_SecureHash");
        data.remove("vnp_SecureHashType");
        return buildQueryString(data);
    }
}
