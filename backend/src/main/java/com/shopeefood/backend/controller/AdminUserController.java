package com.shopeefood.backend.controller;

import com.shopeefood.backend.dto.AdminCustomerResponse;
import com.shopeefood.backend.dto.AdminOwnerRestaurantResponse;
import com.shopeefood.backend.dto.AdminShipperResponse;
import com.shopeefood.backend.entity.Account;
import com.shopeefood.backend.entity.Customer;
import com.shopeefood.backend.entity.Owner;
import com.shopeefood.backend.entity.Restaurant;
import com.shopeefood.backend.entity.Shipper;
import com.shopeefood.backend.repository.AccountRepository;
import com.shopeefood.backend.repository.CustomerRepository;
import com.shopeefood.backend.repository.OwnerRepository;
import com.shopeefood.backend.repository.RestaurantRepository;
import com.shopeefood.backend.repository.ShipperRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin/users")
public class AdminUserController {

    @Autowired
    private AccountRepository accountRepository;

    @Autowired
    private CustomerRepository customerRepository;

    @Autowired
    private ShipperRepository shipperRepository;

    @Autowired
    private OwnerRepository ownerRepository;

    @Autowired
    private RestaurantRepository restaurantRepository;

    // ========= KHÁCH HÀNG =========
    @GetMapping("/customers")
    public List<AdminCustomerResponse> getCustomers() {
        List<Account> accounts = accountRepository.findByRole("CUSTOMER");
        if (accounts.isEmpty()) {
            return Collections.emptyList();
        }

        List<Integer> ids = accounts.stream()
                .map(Account::getId)
                .toList();

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

    // ========= SHIPPER =========
    @GetMapping("/shippers")
    public List<AdminShipperResponse> getShippers() {
        List<Account> accounts = accountRepository.findByRole("SHIPPER");
        if (accounts.isEmpty()) {
            return Collections.emptyList();
        }

        List<Integer> ids = accounts.stream()
                .map(Account::getId)
                .toList();

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

    // ========= CHỦ NHÀ HÀNG =========
    @GetMapping("/owners")
    public List<AdminOwnerRestaurantResponse> getOwners() {
        List<Account> accounts = accountRepository.findByRole("OWNER");
        if (accounts.isEmpty()) {
            return Collections.emptyList();
        }

        List<Integer> ownerIds = accounts.stream()
                .map(Account::getId)
                .toList();

        Map<Integer, Owner> ownerMap = ownerRepository.findAllById(ownerIds)
                .stream()
                .collect(Collectors.toMap(Owner::getAccountId, o -> o));

        // Lấy danh sách quán theo danh sách owner
        List<Restaurant> restaurants = restaurantRepository.findByOwnerAccountIdIn(ownerIds);
        Map<Integer, Restaurant> restaurantByOwnerId = restaurants.stream()
                .collect(Collectors.toMap(
                        r -> r.getOwner().getAccountId(),
                        r -> r,
                        (r1, r2) -> r1 // nếu 1 owner có nhiều quán thì tạm lấy quán đầu tiên
                ));

        List<AdminOwnerRestaurantResponse> result = new ArrayList<>();
        for (Account acc : accounts) {
            AdminOwnerRestaurantResponse dto = new AdminOwnerRestaurantResponse();
            dto.setAccountId(acc.getId());
            dto.setUsername(acc.getUsername());
            dto.setRole(acc.getRole());
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
                dto.setRestaurantStatus(
                        r.getStatus() != null ? r.getStatus().name() : null
                );
            }

            result.add(dto);
        }

        return result;
    }
}

