export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
}

export interface AuthToken {
  accessToken: string;
  refreshToken: string;
}
