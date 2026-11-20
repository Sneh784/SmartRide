package com.smartride.backend.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Past;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.util.List;

public class DriverRegistrationRequest {
    @NotBlank @Size(max = 255)
    private String fullName;
    @NotBlank @Email @Size(max = 255)
    private String email;
    @NotBlank @Pattern(regexp = "^\\s*(?:\\+?91[ -]?)?[6-9](?:[ -]?[0-9]){9}\\s*$")
    private String mobileNumber;
    @NotBlank @Size(max = 72)
    @Pattern(regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9]).{8,}$")
    private String password;
    @NotBlank @Size(max = 72)
    private String confirmPassword;
    @NotNull @Past
    private LocalDate dateOfBirth;
    @NotBlank @Size(max = 1000)
    private String address;
    @NotBlank @Size(max = 100)
    private String city;
    @NotBlank @Size(max = 100)
    private String state;
    @NotBlank @Pattern(regexp = "^[0-9]{6}$")
    private String pincode;
    @NotBlank @Size(max = 50) @Pattern(regexp = "^[A-Za-z0-9 -]{5,50}$")
    private String licenseNumber;
    @NotNull @Future
    private LocalDate licenseExpiryDate;
    @NotNull @Min(0) @Max(60)
    private Integer drivingExperienceYears;
    @NotEmpty @Size(max = 9)
    private List<@NotBlank @Size(max = 50) String> vehicleCategories;
    private boolean termsAccepted;
    private boolean driverPoliciesAccepted;

    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getMobileNumber() { return mobileNumber; }
    public void setMobileNumber(String mobileNumber) { this.mobileNumber = mobileNumber; }
    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }
    public String getConfirmPassword() { return confirmPassword; }
    public void setConfirmPassword(String confirmPassword) { this.confirmPassword = confirmPassword; }
    public LocalDate getDateOfBirth() { return dateOfBirth; }
    public void setDateOfBirth(LocalDate dateOfBirth) { this.dateOfBirth = dateOfBirth; }
    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }
    public String getCity() { return city; }
    public void setCity(String city) { this.city = city; }
    public String getState() { return state; }
    public void setState(String state) { this.state = state; }
    public String getPincode() { return pincode; }
    public void setPincode(String pincode) { this.pincode = pincode; }
    public String getLicenseNumber() { return licenseNumber; }
    public void setLicenseNumber(String licenseNumber) { this.licenseNumber = licenseNumber; }
    public LocalDate getLicenseExpiryDate() { return licenseExpiryDate; }
    public void setLicenseExpiryDate(LocalDate licenseExpiryDate) { this.licenseExpiryDate = licenseExpiryDate; }
    public Integer getDrivingExperienceYears() { return drivingExperienceYears; }
    public void setDrivingExperienceYears(Integer drivingExperienceYears) { this.drivingExperienceYears = drivingExperienceYears; }
    public List<String> getVehicleCategories() { return vehicleCategories; }
    public void setVehicleCategories(List<String> vehicleCategories) { this.vehicleCategories = vehicleCategories; }
    public boolean isTermsAccepted() { return termsAccepted; }
    public void setTermsAccepted(boolean termsAccepted) { this.termsAccepted = termsAccepted; }
    public boolean isDriverPoliciesAccepted() { return driverPoliciesAccepted; }
    public void setDriverPoliciesAccepted(boolean driverPoliciesAccepted) { this.driverPoliciesAccepted = driverPoliciesAccepted; }
}
