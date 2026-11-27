from django.contrib import admin
from .models import (
    ActivityLog,
    BillShare,
    ExpenseGroup,
    GroupMembership,
    Notification,
    SharedBill,
    StellarSettlementTransaction,
    User,
)

admin.site.register(User)
admin.site.register(ExpenseGroup)
admin.site.register(GroupMembership)
admin.site.register(SharedBill)
admin.site.register(BillShare)
admin.site.register(StellarSettlementTransaction)
admin.site.register(ActivityLog)
admin.site.register(Notification)
