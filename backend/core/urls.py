from django.urls import include, path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from .views import (
    ConnectWalletView,
    DisconnectWalletView,
    EmailOrUsernameLoginView,
    ExpenseGroupViewSet,
    FaucetSimulatedUsdcView,
    NotificationViewSet,
    ProfileView,
    RegisterView,
    SharedBillViewSet,
    SmartContractMetadataView,
    StellarSettlementTransactionViewSet,
    UserDashboardView,
    WalletAuthView,
    WorkspaceBootstrapView,
)

router = DefaultRouter()
router.register(r"groups", ExpenseGroupViewSet, basename="expense-group")
router.register(r"bills", SharedBillViewSet, basename="shared-bill")
router.register(
    r"transactions",
    StellarSettlementTransactionViewSet,
    basename="stellar-transaction",
)
router.register(
    r"notifications",
    NotificationViewSet,
    basename="notification",
)

urlpatterns = [
    # Complete Workspace Bootstrap (Zero mock data in frontend)
    path("workspace/", WorkspaceBootstrapView.as_view(), name="workspace-bootstrap"),
    # Authentication & User Management
    path("auth/register/", RegisterView.as_view(), name="auth-register"),
    path("auth/login/", EmailOrUsernameLoginView.as_view(), name="auth-login"),
    path("auth/token/", TokenObtainPairView.as_view(), name="auth-token"),
    path("auth/refresh/", TokenRefreshView.as_view(), name="auth-refresh"),
    path("auth/wallet/", WalletAuthView.as_view(), name="auth-wallet"),
    path("users/me/", ProfileView.as_view(), name="user-profile"),
    path(
        "users/connect-wallet/",
        ConnectWalletView.as_view(),
        name="user-connect-wallet",
    ),
    path(
        "users/disconnect-wallet/",
        DisconnectWalletView.as_view(),
        name="user-disconnect-wallet",
    ),
    path("users/dashboard/", UserDashboardView.as_view(), name="user-dashboard"),
    # Stellar Testnet Smart Contract & Faucet Integration
    path(
        "stellar/contract-info/",
        SmartContractMetadataView.as_view(),
        name="stellar-contract-info",
    ),
    path(
        "stellar/faucet/",
        FaucetSimulatedUsdcView.as_view(),
        name="stellar-faucet",
    ),
    # ViewSet Router
    path("", include(router.urls)),
]
