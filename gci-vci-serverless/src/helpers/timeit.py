import time
import json

class TimerPerf():
    def __init__(self):
        self.timings = {}

    def timeit(self, method):
        def timed(*args, **kw):
            ts = time.time()
            result = method(*args, **kw)
            te = time.time()        
            delta = te - ts
            
            if method.__name__ in self.timings:
                self.timings[method.__name__].append(delta)
            else:
                self.timings[method.__name__] = [delta]
            
            print(f"Finished {method.__name__}: {round(delta*1000,2)}")
            return result    
        return timed

    def get_timings(self):
        reports = {}
        for name, deltas in self.timings.items():
            total = sum(deltas) * 1000
            mean = total/len(deltas)
            largest = max(deltas) *1000
            smallest = min(deltas) *1000

            reports[name] = {
                'total': round(total,2),
                'mean': round(mean,2),
                'max': round(largest,2),
                'min': round(smallest, 2)
            }

        return reports

    def reset(self):
        self.timings = {}