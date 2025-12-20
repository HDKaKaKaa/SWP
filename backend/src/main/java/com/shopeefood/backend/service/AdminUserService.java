package com.shopeefood.backend.service;

import com.shopeefood.backend.dto.*;
import com.shopeefood.backend.entity.*;
import com.shopeefood.backend.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AdminUserService {

    private final AccountRepository accountRepository;
    private final CustomerRepository customerRepository;
    private final ShipperRepository shipperRepository;
    private final OwnerRepository ownerRepository;
    private final RestaurantRepository restaurantRepository;

    public List<AdminCustomerResponse> getCustomers() {
        List<Account> accounts = accountRepository.findByRole("CUSTOMER");
        if (accounts.isEmpty()) return Collections.emptyList();

        List<Integer> ids = accounts.stream().map(Account::getId).toList();

        Map<Integer, Customer> customerMap = customerRepository.findAllById(ids)
                .stream()
                .collect(Collectors.toMap(Customer::getAccountId, c -> c));

        List<AdminCustomerResponse> result = new ArrayList<>();
        for (Account acc : accounts) {
            AdminCustomerResponse dto = new AdminCustomerResponse();
            dto.setAccountId(acc.getId());
            dto.setUsername(acc.getUsername());
            dto.setRole(acc.getRole());
            dto.setEmail(acc.getEmail());
            dto.setPhone(acc.getPhone());
            dto.setIsActive(acc.getIsActive());

            Customer c = customerMap.get(acc.getId());
            if (c != null) {
                dto.setFullName(c.getFullName());
                dto.setAddress(c.getAddress());
            }
            result.add(dto);
        }
        return result;
    }

    public List<AdminShipperResponse> getShippers() {
        List<Account> accounts = accountRepository.findByRole("SHIPPER");
        if (accounts.isEmpty()) return Collections.emptyList();

        List<Integer> ids = accounts.stream().map(Account::getId).toList();

        Map<Integer, Shipper> shipperMap = shipperRepository.findAllById(ids)
                .stream()
                .collect(Collectors.toMap(Shipper::getAccountId, s -> s));

        List<AdminShipperResponse> result = new ArrayList<>();
        for (Account acc : accounts) {
            AdminShipperResponse dto = new AdminShipperResponse();
            dto.setAccountId(acc.getId());
            dto.setUsername(acc.getUsername());
            dto.setRole(acc.getRole());
            dto.setEmail(acc.getEmail());
            dto.setPhone(acc.getPhone());
            dto.setIsActive(acc.getIsActive());

            Shipper s = shipperMap.get(acc.getId());
            if (s != null) {
                dto.setFullName(s.getFullName());
                dto.setLicensePlate(s.getLicensePlate());
                dto.setVehicleType(s.getVehicleType());
                dto.setStatus(s.getStatus());
            }
            result.add(dto);
        }
        return result;
    }

    public List<AdminOwnerRestaurantResponse> getOwners() {

        // 1) Lấy ownerId từ restaurants (dù role account chưa phải OWNER)
        Set<Integer> ownerIdSet = new LinkedHashSet<>(restaurantRepository.findDistinctOwnerAccountIds());

        // 2) Bổ sung thêm các account đã là OWNER (phòng trường hợp owner không còn nhà hàng)
        accountRepository.findByRole("OWNER").forEach(a -> ownerIdSet.add(a.getId()));

        if (ownerIdSet.isEmpty()) return Collections.emptyList();

        List<Integer> ownerIds = new ArrayList<>(ownerIdSet);

        // 3) Lấy account + owner profile
        List<Account> accounts = accountRepository.findAllById(ownerIds);
        accounts.sort(Comparator.comparing(Account::getId)); // ổn định: id tăng dần

        Map<Integer, Owner> ownerMap = ownerRepository.findAllById(ownerIds)
                .stream()
                .collect(Collectors.toMap(Owner::getAccountId, o -> o));

        // 4) Nếu vẫn muốn trả kèm "1 quán đại diện" (để không phá DTO/API cũ)
        List<Restaurant> restaurants = restaurantRepository.findByOwnerAccountIdIn(ownerIds);

        Map<Integer, Restaurant> restaurantByOwnerId = new HashMap<>();
        for (Restaurant r : restaurants) {
            if (r == null || r.getOwner() == null) continue;
            Integer oid = r.getOwner().getAccountId();

            // pick quán mới nhất theo createdAt (tránh random)
            Restaurant current = restaurantByOwnerId.get(oid);
            if (current == null) {
                restaurantByOwnerId.put(oid, r);
            } else if (current.getCreatedAt() == null) {
                restaurantByOwnerId.put(oid, r);
            } else if (r.getCreatedAt() != null && r.getCreatedAt().isAfter(current.getCreatedAt())) {
                restaurantByOwnerId.put(oid, r);
            }
        }

        List<AdminOwnerRestaurantResponse> result = new ArrayList<>();
        for (Account acc : accounts) {
            AdminOwnerRestaurantResponse dto = new AdminOwnerRestaurantResponse();
            dto.setAccountId(acc.getId());
            dto.setUsername(acc.getUsername());

            // IMPORTANT: owner list thì role hiển thị nên là OWNER để UI không hiểu sai
            dto.setRole("OWNER");

            dto.setEmail(acc.getEmail());
            dto.setPhone(acc.getPhone());
            dto.setIsActive(acc.getIsActive());

            Owner owner = ownerMap.get(acc.getId());
            if (owner != null) {
                dto.setOwnerFullName(owner.getFullName());
                dto.setOwnerIdCardNumber(owner.getIdCardNumber());
            }

            Restaurant r = restaurantByOwnerId.get(acc.getId());
            if (r != null) {
                dto.setRestaurantId(r.getId());
                dto.setRestaurantName(r.getName());
                dto.setRestaurantAddress(r.getAddress());
                dto.setRestaurantPhone(r.getPhone());
                dto.setRestaurantCoverImage(r.getCoverImage());
                dto.setRestaurantStatus(r.getStatus() != null ? r.getStatus().name() : null);
            }

            result.add(dto);
        }

        return result;
    }

    public AdminUserDetailResponse getUserDetail(Integer accountId) {
        Account acc = accountRepository.findById(accountId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy tài khoản"));

        if (acc.getRole() != null && acc.getRole().equalsIgnoreCase("ADMIN")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Không hỗ trợ xem chi tiết tài khoản ADMIN");
        }

        AdminUserDetailResponse dto = new AdminUserDetailResponse();
        dto.setAccountId(acc.getId());
        dto.setUsername(acc.getUsername());
        dto.setEmail(acc.getEmail());
        dto.setPhone(acc.getPhone());
        dto.setRole(acc.getRole());
        dto.setIsActive(acc.getIsActive());

        String role = acc.getRole() == null ? "" : acc.getRole().toUpperCase();

        // ===== Detect owner dù role chưa đổi: chỉ cần có Owner profile hoặc có restaurants =====
        Owner ownerProfile = ownerRepository.findById(accountId).orElse(null);

        // để tránh query 2 lần, lấy restaurants 1 lần rồi dùng luôn
        List<Restaurant> ownerRestaurants = restaurantRepository.findByOwnerId(accountId);
        boolean hasOwnerProfile = ownerProfile != null;
        boolean hasRestaurants = ownerRestaurants != null && !ownerRestaurants.isEmpty();

        if ("OWNER".equals(role) || hasOwnerProfile || hasRestaurants) {
            // ép role hiển thị để frontend không bị mất block OWNER trong modal
            dto.setRole("OWNER");

            if (ownerProfile != null) {
                dto.setOwnerFullName(ownerProfile.getFullName());
                dto.setOwnerIdCardNumber(ownerProfile.getIdCardNumber());
            }

            List<AdminRestaurantBriefDTO> restaurantDtos = ownerRestaurants.stream().map(r -> {
                AdminRestaurantBriefDTO rd = new AdminRestaurantBriefDTO();
                rd.setId(r.getId());
                rd.setName(r.getName());
                rd.setAddress(r.getAddress());
                rd.setPhone(r.getPhone());
                rd.setCoverImage(r.getCoverImage());
                rd.setDescription(r.getDescription());
                rd.setLatitude(r.getLatitude());
                rd.setLongitude(r.getLongitude());
                rd.setCreatedAt(r.getCreatedAt());
                rd.setStatus(r.getStatus() != null ? r.getStatus().name() : null);
                return rd;
            }).toList();

            dto.setRestaurants(restaurantDtos);
            return dto;
        }
        // ===== END detect owner =====

        switch (role) {
            case "CUSTOMER" -> {
                Customer c = customerRepository.findById(accountId).orElse(null);
                if (c != null) {
                    dto.setCustomerFullName(c.getFullName());
                    dto.setCustomerAddress(c.getAddress());
                    dto.setCustomerLatitude(c.getLatitude());
                    dto.setCustomerLongitude(c.getLongitude());
                }
            }
            case "SHIPPER" -> {
                Shipper s = shipperRepository.findById(accountId).orElse(null);
                if (s != null) {
                    dto.setShipperFullName(s.getFullName());
                    dto.setShipperLicensePlate(s.getLicensePlate());
                    dto.setShipperVehicleType(s.getVehicleType());
                    dto.setShipperStatus(s.getStatus());
                    dto.setShipperCurrentLat(s.getCurrentLat());
                    dto.setShipperCurrentLong(s.getCurrentLong());
                }
            }
            default -> { /* role khác: chỉ common */ }
        }

        return dto;
    }
}
