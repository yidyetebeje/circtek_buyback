import { HttpInterceptorFn } from '@angular/common/http';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // For this example, we'll get the token from localStorage.
  // In a real-world app, you might use a more secure storage or a state management solution.
  const authToken = localStorage.getItem('auth_token');

  // Clone the request and add the authorization header if the token exists.
  if (authToken) {
    const authReq = req.clone({
      headers: req.headers.set('Authorization', `Bearer ${authToken}`),
    });
    return next(authReq);
  }

  // If no token, pass the original request through.
  return next(req);
};
