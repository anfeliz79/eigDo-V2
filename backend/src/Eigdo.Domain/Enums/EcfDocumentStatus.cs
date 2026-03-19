namespace Eigdo.Domain.Enums;

public enum EcfDocumentStatus
{
    Draft = 0,
    Queued = 1,
    Submitted = 2,
    Accepted = 3,
    Rejected = 4,
    Annulled = 5,
    BlockedByConfig = 6,
    RetryPending = 7
}
