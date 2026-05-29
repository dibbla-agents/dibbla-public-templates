using System.Collections.Concurrent;

namespace ExpenseReporter;

/// <summary>
/// Thread-safe, in-memory session store. Uploaded PDF bytes live here for the
/// lifetime of the session and are never persisted. Mirrors the Go
/// <c>SessionStore</c> (sync map + 30-min cleanup goroutine).
/// </summary>
public sealed class SessionStore
{
    private readonly ConcurrentDictionary<string, Session> _sessions = new();

    public Session? Get(string id) =>
        _sessions.TryGetValue(id, out var s) ? s : null;

    public Session GetOrCreate(string id) =>
        _sessions.GetOrAdd(id, key => new Session { Id = key, CreatedAt = DateTime.UtcNow });

    /// <summary>Evicts sessions older than two hours. Called by the sweeper.</summary>
    public void EvictExpired(TimeSpan maxAge)
    {
        var now = DateTime.UtcNow;
        foreach (var kv in _sessions)
        {
            if (now - kv.Value.CreatedAt > maxAge)
            {
                _sessions.TryRemove(kv.Key, out _);
            }
        }
    }
}

/// <summary>
/// Background service replacing the Go cleanup goroutine: every 30 minutes it
/// removes sessions older than 2 hours.
/// </summary>
public sealed class SessionCleanupService(SessionStore store) : BackgroundService
{
    private static readonly TimeSpan Interval = TimeSpan.FromMinutes(30);
    private static readonly TimeSpan MaxAge = TimeSpan.FromHours(2);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await Task.Delay(Interval, stoppingToken);
            }
            catch (OperationCanceledException)
            {
                break;
            }
            store.EvictExpired(MaxAge);
        }
    }
}
