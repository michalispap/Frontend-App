import { defineStore } from "pinia";
import { ref } from "vue";
import apiClient from "../services/api";
import { getCurrentUser, fetchUserAttributes } from 'aws-amplify/auth';

export const useUserStore = defineStore("user", () => {
  const user = ref({
    firstName: "",
    lastName: "",
    email: "",
    id: ""
  });
  
  const isLoading = ref(false);
  const error = ref(null);

  const fetchUser = async () => {
    isLoading.value = true;
    error.value = null;
    
    try {
      // Get Cognito user information - both ID and email
      const cognitoUser = await getCurrentUser();
      user.value.id = cognitoUser.userId;
      
      // Fetch user attributes to get email
      const userAttributes = await fetchUserAttributes();
      user.value.email = userAttributes.email || "";
      
      console.log("Using Cognito User ID:", user.value.id);
      console.log("Using Cognito Email:", user.value.email);
      
      if (!user.value.id) {
        throw new Error("Could not get user ID");
      }
      
      if (!user.value.email) {
        throw new Error("Could not get user email from Cognito");
      }
      
      // Request to the specific endpoint with the actual user ID
      const response = await apiClient.get(`/api/students/${user.value.id}`);
      
      // Map the response fields but keep email from Cognito
      user.value = {
        id: user.value.id,
        email: user.value.email, // Keep Cognito email
        firstName: response.data.first_name || "",
        lastName: response.data.last_name || "",
      };
      
      console.log("Profile data loaded successfully");
      
    } catch (err) {
      console.error("Error fetching user data:", err);
      error.value = "Failed to load profile data. Please try again later.";
    } finally {
      isLoading.value = false;
    }
  };
  
  const updateUser = async (newUserData) => {
    isLoading.value = true;
    error.value = null;
    
    try {
      // Make sure we have the user ID and email
      if (!user.value.id || !user.value.email) {
        const cognitoUser = await getCurrentUser();
        user.value.id = cognitoUser.userId;
        
        // Fetch user attributes to get email
        const userAttributes = await fetchUserAttributes();
        user.value.email = userAttributes.email || "";
      }
      
      // POST to upsert endpoint with email from Cognito
      const response = await apiClient.post("/api/students/upsert", {
        id: user.value.id,
        first_name: newUserData.firstName,
        last_name: newUserData.lastName,
        email: user.value.email  // Using email from Cognito
      });
      
      // Update local state
      user.value = {
        ...user.value,
        firstName: newUserData.firstName,
        lastName: newUserData.lastName
      };
      
      return response.data;
    } catch (err) {
      console.error("Error updating user:", err);
      error.value = "Failed to update profile. Please try again later.";
      throw err;
    } finally {
      isLoading.value = false;
    }
  };

  return { user, isLoading, error, fetchUser, updateUser };
});