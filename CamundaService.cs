#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

@interface CamundaService : NSObject

- (void)fetchProcessDefinitionsWithCompletion:(void (^)(NSArray *definitions, NSError *error))completion;
- (void)fetchTasksForProcessDefinition:(NSString *)processDefinitionId completion:(void (^)(NSArray *tasks, NSError *error))completion;

@end

NS_ASSUME_NONNULL_END
