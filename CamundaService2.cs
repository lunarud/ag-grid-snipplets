#import "CamundaService.h"
#import <AFNetworking/AFNetworking.h>

@implementation CamundaService

static NSString *const kBaseURL = @"http://localhost:8080/engine-rest";
static NSString *const kUsername = @"demo";
static NSString *const kPassword = @"demo";

- (AFHTTPSessionManager *)manager {
    AFHTTPSessionManager *manager = [AFHTTPSessionManager manager];
    [manager.requestSerializer setAuthorizationHeaderFieldWithUsername:kUsername password:kPassword];
    return manager;
}

- (void)fetchProcessDefinitionsWithCompletion:(void (^)(NSArray *definitions, NSError *error))completion {
    NSString *url = [NSString stringWithFormat:@"%@/process-definition", kBaseURL];
    [[self manager] GET:url parameters:nil headers:nil progress:nil
                success:^(NSURLSessionDataTask *task, id responseObject) {
                    NSArray *definitions = (NSArray *)responseObject;
                    NSMutableArray *result = [NSMutableArray array];
                    for (NSDictionary *def in definitions) {
                        [result addObject:@{
                            @"id": def[@"id"] ?: @"",
                            @"key": def[@"key"] ?: @"",
                            @"name": def[@"name"] ?: @"Unnamed Process",
                            @"version": def[@"version"] ?: @0
                        }];
                    }
                    completion(result, nil);
                } failure:^(NSURLSessionDataTask *task, NSError *error) {
                    completion(nil, error);
                }];
}

- (void)fetchTasksForProcessDefinition:(NSString *)processDefinitionId completion:(void (^)(NSArray *tasks, NSError *error))completion {
    NSString *url = [NSString stringWithFormat:@"%@/task", kBaseURL];
    NSDictionary *params = @{@"processDefinitionId": processDefinitionId};
    [[self manager] GET:url parameters:params headers:nil progress:nil
                success:^(NSURLSessionDataTask *task, id responseObject) {
                    NSArray *tasks = (NSArray *)responseObject;
                    NSMutableArray *result = [NSMutableArray array];
                    for (NSDictionary *task in tasks) {
                        [result addObject:@{
                            @"id": task[@"id"] ?: @"",
                            @"name": task[@"name"] ?: @"Unnamed Task",
                            @"assignee": task[@"assignee"] ?: @"Unassigned",
                            @"created": task[@"created"] ?: @""
                        }];
                    }
                    completion(result, nil);
                } failure:^(NSURLSessionDataTask *task, NSError *error) {
                    completion(nil, error);
                }];
}

@end
