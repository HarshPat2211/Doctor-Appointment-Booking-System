import api from "./api";

export const verifyAuth = async () => {
  const { data } = await api.get("/auth/verify");
  return data;
};

export const loginUser = async (payload) => {
  const { data } = await api.post("/auth/login", payload);
  return data;
};
